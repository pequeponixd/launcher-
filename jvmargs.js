'use strict';
/**
 * Argumentos de la JVM que el instalador de Forge/NeoForge deja en el JSON de su versión
 * (`arguments.jvm`): --add-opens, --add-exports, --add-modules, -p (module path), -DignoreList, etc.
 *
 * minecraft-launcher-core NO lee `arguments.jvm`, así que sin esto Forge 1.17+ se cae al arrancar con
 *   InaccessibleObjectException: module java.base does not "opens java.lang.invoke" to unnamed module
 * (el launcher oficial sí los aplica). Aquí se leen, se les aplican las reglas del sistema operativo y se
 * reemplazan los placeholders; el resultado va a la opción `customArgs` de minecraft-launcher-core.
 *
 * Se omiten los que el propio minecraft-launcher-core ya pone (classpath, natives, marca del launcher).
 */
const fs = require('fs');
const path = require('path');

const OS_NAME = { win32: 'windows', linux: 'linux', darwin: 'osx' };

function archName(arch) {
  return arch === 'ia32' ? 'x86' : arch;
}

/** Reglas del JSON de Mojang: gana la última que coincide; sin reglas, el argumento se usa siempre. */
function ruleAllows(rules, env) {
  if (!Array.isArray(rules) || !rules.length) return true;
  let allowed = false;
  for (const r of rules) {
    let match = true;
    if (r.os) {
      if (r.os.name && r.os.name !== env.osName) match = false;
      if (r.os.arch && r.os.arch !== env.arch) match = false;
      if (r.os.version) {
        try {
          if (!new RegExp(r.os.version).test(env.osVersion || '')) match = false;
        } catch {
          match = false;
        }
      }
    }
    if (r.features) match = false; // este launcher no activa ninguna «feature» (demo, resolución propia…)
    if (match) allowed = r.action === 'allow';
  }
  return allowed;
}

/** Aplana la lista: cadenas sueltas u objetos { rules, value }. */
function flatten(list, env) {
  const out = [];
  for (const entry of list || []) {
    if (typeof entry === 'string') out.push(entry);
    else if (entry && ruleAllows(entry.rules, env)) out.push(...[].concat(entry.value ?? []));
  }
  return out;
}

const PLACEHOLDER = /\$\{([^}]+)\}/g;

function expand(arg, vars) {
  let missing = false;
  const text = arg.replace(PLACEHOLDER, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) return vars[key];
    missing = true;
    return '';
  });
  return missing ? null : text;
}

// Los pone ya minecraft-launcher-core (y con los valores correctos para este launcher).
const OWN = [/^-Djava\.library\.path=/, /^-Dminecraft\.launcher\./, /\$\{classpath\}/, /\$\{natives_directory\}/];
const OWN_FLAG_WITH_VALUE = new Set(['-cp', '-classpath', '--class-path']);

const isBareFlag = (a) => a.startsWith('-') && !a.includes('=') && !/^-(D|X)/.test(a);

/**
 * list: `arguments.jvm` tal cual viene en el JSON.
 * ctx: { libraryDirectory, versionName, osName?, arch?, osVersion?, delimiter? }
 */
function buildJvmArgs(list, ctx) {
  const env = {
    osName: ctx.osName || OS_NAME[process.platform] || process.platform,
    arch: ctx.arch || archName(process.arch),
    osVersion: ctx.osVersion || '',
  };
  const vars = {
    library_directory: ctx.libraryDirectory,
    classpath_separator: ctx.delimiter || path.delimiter,
    version_name: ctx.versionName,
  };

  const out = [];
  const raw = flatten(list, env);
  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (OWN_FLAG_WITH_VALUE.has(arg)) {
      i++; // se salta también su valor
      continue;
    }
    if (OWN.some((re) => re.test(arg))) continue;
    const text = expand(arg, vars);
    if (text === null) {
      // placeholder desconocido: no se pasa, y si era el valor de una opción suelta (-p …), tampoco la opción
      if (out.length && isBareFlag(out[out.length - 1])) out.pop();
      continue;
    }
    out.push(text);
  }
  return out;
}

/** Lee versions/<nombre>/<nombre>.json y devuelve sus argumentos de JVM ya listos ([] si no hay). */
async function loadJvmArgs(root, versionName, extra = {}) {
  const file = path.join(root, 'versions', versionName, `${versionName}.json`);
  let json;
  try {
    json = JSON.parse(await fs.promises.readFile(file, 'utf8'));
  } catch {
    return [];
  }
  const list = json && json.arguments && json.arguments.jvm;
  if (!Array.isArray(list)) return [];
  return buildJvmArgs(list, { libraryDirectory: path.join(root, 'libraries'), versionName, ...extra });
}

module.exports = { buildJvmArgs, loadJvmArgs, ruleAllows };
