'use strict';
/**
 * Panel de administración del modpack: agregar/quitar mods y publicar para todos.
 *
 * Trabaja sobre el clon de git del repo del modpack y usa las credenciales que ya tiene git/gh
 * en el PC del administrador. El launcher no guarda contraseñas ni tokens: en el PC de un jugador
 * sin permisos sobre el repo, publicar simplemente falla en el `git push`.
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { buildManifest, writeManifest, readPack } = require('./manifest');
const { snapshotMods, diffMods } = require('./changes');
const { installMenu } = require('./fancymenu-layout');

const BIG = 95 * 1048576; // GitHub rechaza archivos de más de 100 MB en el repo
const BIG_RELEASE = 'mods-grandes';

function exec(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    // GIT_TERMINAL_PROMPT=0: si faltan credenciales, falla en vez de quedarse esperando una contraseña
    execFile(cmd, args, { cwd, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, maxBuffer: 16 * 1048576, windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        const msg = (stderr || stdout || err.message).toString().trim();
        const e = new Error(err.code === 'ENOENT' ? `No se encontró "${cmd}". ¿Está instalado?` : msg);
        e.code = err.code;
        return reject(e);
      }
      resolve(stdout.toString());
    });
  });
}

const sha1 = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
const toPosix = (p) => p.split(path.sep).join('/');

class ModpackAdmin {
  /** repo: raíz del clon git · pack: carpeta con pack.json (puede ser la misma o Modpack/) */
  constructor(repo, pack, { exec: run = exec } = {}) {
    this.repo = repo;
    this.pack = pack;
    this.exec = run;
    this.packRel = toPosix(path.relative(repo, pack)) || '.';
  }

  /** A partir de cualquier carpeta del repo, encuentra la raíz y la carpeta del modpack. */
  static async locate(dir, opts = {}) {
    const run = opts.exec || exec;
    let repo;
    try {
      repo = (await run('git', ['rev-parse', '--show-toplevel'], dir)).trim();
    } catch {
      throw new Error('Esa carpeta no es un repositorio de git. Elige la carpeta donde clonaste el repo del modpack.');
    }
    repo = path.resolve(repo);
    for (const cand of [dir, path.join(repo, 'Modpack'), path.join(repo, 'modpack'), repo]) {
      if (fs.existsSync(path.join(cand, 'pack.json'))) return new ModpackAdmin(repo, path.resolve(cand), opts);
    }
    throw new Error('No encontré pack.json en esa carpeta ni en Modpack/.');
  }

  git(...args) {
    return this.exec('git', args, this.repo);
  }

  modsDir() {
    return path.join(this.pack, 'mods');
  }

  /** Trae los cambios de GitHub. Devuelve null si salió bien o el mensaje de error. */
  async pull() {
    try {
      await this.git('pull', '--ff-only', '--autostash');
      return null;
    } catch (e) {
      return e.message;
    }
  }

  async listMods() {
    const dir = this.modsDir();
    if (!fs.existsSync(dir)) return [];
    const out = [];
    for (const name of (await fsp.readdir(dir)).sort((a, b) => a.localeCompare(b))) {
      if (!name.toLowerCase().endsWith('.jar')) continue;
      const st = await fsp.stat(path.join(dir, name));
      out.push({ name, size: st.size, big: st.size > BIG });
    }
    return out;
  }

  // Mods tal como están publicados (manifest.json del último commit) vs como están ahora en la carpeta
  async publishedManifest() {
    try {
      return JSON.parse(await this.git('show', `HEAD:${this.packRel === '.' ? '' : this.packRel + '/'}manifest.json`));
    } catch {
      return null; // primera publicación
    }
  }

  async pendingChanges() {
    const m = await this.publishedManifest();
    const published = m ? snapshotMods(m.files) : {};
    const now = {};
    for (const m of await this.listMods()) now[`mods/${m.name}`] = sha1(path.join(this.modsDir(), m.name));
    return diffMods(published, now);
  }

  async status({ pull = true } = {}) {
    const syncError = pull ? await this.pull() : null;
    const pack = readPack(this.pack);
    return {
      repo: this.repo,
      syncError,
      pack: {
        id: pack.id,
        name: pack.name,
        version: pack.version || '',
        server: pack.server || '',
        changelog: Array.isArray(pack.changelog) ? pack.changelog.join('\n') : pack.changelog || '',
      },
      mods: await this.listMods(),
      changes: await this.pendingChanges(),
    };
  }

  /** Copia .jar a mods/. Devuelve los nombres agregados. */
  async addMods(files) {
    await fsp.mkdir(this.modsDir(), { recursive: true });
    const added = [];
    for (const f of files) {
      const name = path.basename(f);
      if (!name.toLowerCase().endsWith('.jar')) continue;
      await fsp.copyFile(f, path.join(this.modsDir(), name));
      added.push(name);
    }
    return added;
  }

  async removeMod(name) {
    // solo un nombre de archivo .jar dentro de mods/, nunca una ruta
    if (!/^[^/\\]+\.jar$/i.test(name) || name.startsWith('.')) throw new Error('Nombre de mod no válido');
    await fsp.rm(path.join(this.modsDir(), name), { force: true });
  }

  // Archivos de más de 95 MB: van a un Release de GitHub (con gh) y el manifest apunta ahí
  async uploadBigFiles(pack, step) {
    const big = buildManifest(this.pack).files.filter((f) => f.size > BIG);
    const external = { ...(pack.externalUrls || {}) };
    for (const rel of Object.keys(external)) if (!fs.existsSync(path.join(this.pack, rel))) delete external[rel];
    if (!big.length) return external;

    const slug = JSON.parse(await this.exec('gh', ['repo', 'view', '--json', 'nameWithOwner'], this.repo)).nameWithOwner;
    try {
      await this.exec('gh', ['release', 'view', BIG_RELEASE], this.repo);
    } catch {
      await this.exec('gh', ['release', 'create', BIG_RELEASE, '--title', 'Mods grandes', '--notes', 'Archivos de más de 100 MB del modpack (los usa el launcher).'], this.repo);
    }
    const before = Object.fromEntries(((await this.publishedManifest()) || { files: [] }).files.map((f) => [f.path, f.sha1]));
    const known = { ...before, ...(pack.externalSha1 || {}) };
    const ignoreFile = path.join(this.repo, '.gitignore');
    let ignore = fs.existsSync(ignoreFile) ? fs.readFileSync(ignoreFile, 'utf8') : '';
    for (const f of big) {
      const abs = path.join(this.pack, f.path);
      const url = `https://github.com/${slug}/releases/download/${BIG_RELEASE}/${encodeURIComponent(path.basename(f.path))}`;
      // solo se sube si es nuevo o cambió (el sha1 se guarda junto a la URL)
      if (external[f.path] !== url || known[f.path] !== f.sha1) {
        step('upload', { file: path.basename(f.path) });
        await this.exec('gh', ['release', 'upload', BIG_RELEASE, abs, '--clobber'], this.repo);
      }
      external[f.path] = url;
      const ignoreLine = toPosix(path.relative(this.repo, abs));
      if (!ignore.split(/\r?\n/).includes(ignoreLine)) ignore = (ignore.trimEnd() ? ignore.trimEnd() + '\n' : '') + ignoreLine + '\n';
    }
    fs.writeFileSync(ignoreFile, ignore);
    pack.externalSha1 = Object.fromEntries(big.map((f) => [f.path, f.sha1]));
    return external;
  }

  /**
   * Publica: trae cambios, sube archivos grandes, actualiza pack.json, menú y manifest, commit y push.
   * step(key, params) informa el avance a la interfaz.
   */
  async publish({ version, notes = '', server } = {}, step = () => {}) {
    step('pull');
    const err = await this.pull();
    if (err) throw new Error('No se pudieron traer los cambios de GitHub:\n' + err);

    const changes = await this.pendingChanges();
    const packFile = path.join(this.pack, 'pack.json');
    const pack = JSON.parse(fs.readFileSync(packFile, 'utf8'));
    if (version) pack.version = String(version).trim();
    const lines = String(notes).split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length) pack.changelog = lines;
    else delete pack.changelog;
    if (server != null) {
      if (String(server).trim()) pack.server = String(server).trim();
      else delete pack.server;
    }

    step('big');
    const external = await this.uploadBigFiles(pack, step);
    if (Object.keys(external).length) pack.externalUrls = external;
    else delete pack.externalUrls;
    fs.writeFileSync(packFile, JSON.stringify(pack, null, 2) + '\n');

    step('menu');
    installMenu(this.pack, { server: pack.server || '' });
    step('manifest');
    writeManifest(this.pack);

    step('commit');
    await this.git('add', '-A', '--', this.packRel, ...(fs.existsSync(path.join(this.repo, '.gitignore')) ? ['.gitignore'] : []));
    // si lo único distinto es manifest.json (cambia su fecha cada vez), no hay nada que publicar
    const manifestRel = (this.packRel === '.' ? '' : this.packRel + '/') + 'manifest.json';
    const staged = (await this.git('diff', '--cached', '--name-only')).split('\n').filter(Boolean);
    if (!staged.some((f) => f !== manifestRel)) {
      await this.git('reset', '-q');
      await this.git('checkout', '--', manifestRel).catch(() => {});
      throw new Error('No hay cambios para publicar.');
    }
    const count = (k) => changes[k].length;
    const title = `Modpack v${pack.version}: +${count('added')} ~${count('updated')} -${count('removed')}`;
    const body = [
      ...changes.added.map((m) => `+ ${m}`),
      ...changes.updated.map((u) => `~ ${u.from} -> ${u.to}`),
      ...changes.removed.map((m) => `- ${m}`),
      ...(lines.length ? ['', ...lines] : []),
    ].join('\n');
    await this.git('commit', '-m', title, ...(body ? ['-m', body] : []));
    step('push');
    await this.git('push');
    return { version: pack.version, title, changes };
  }
}

/** Sugiere la versión siguiente: 1.0.3 → 1.0.4 */
function nextVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(v || ''));
  return m ? `${m[1]}.${m[2]}.${Number(m[3]) + 1}` : '1.0.0';
}

module.exports = { ModpackAdmin, nextVersion, BIG, exec };
