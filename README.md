# Cachusafio Launcher 2.0

Launcher de modpacks para Windows 10/11 y Linux (Arch y otras). Tus amigos lo abren, inician sesión (cuenta Microsoft u offline) y le dan **Play**. No hay IP en el launcher: el botón para entrar al servidor lo pones tú en el menú principal con **FancyMenu**, dentro del modpack.

## Qué hace
- Varios modpacks en la barra lateral (botón **+** para agregar otro con su enlace o `usuario/repo`).
- Login con Microsoft (varias cuentas) o modo offline con nombre de jugador.
- Descarga solo Java, Fabric/Quilt/Forge/NeoForge, Minecraft y el modpack. Actualiza solo lo que cambió.
- Icono, fondo y logo de cada modpack vienen del propio modpack.
- Idiomas: Español / English.

## Crear el modpack (tú, una vez)
1. Carpeta `modpack/` con `mods/`, `config/` (incluye `config/fancymenu/`), `resourcepacks/`… y un `pack.json` (copia `tools/pack.example.json`). Opcional: `icon.png`, `background.png`, `logo.png`.
2. `node tools/generate-manifest.js ./modpack`
3. Sube la carpeta completa a un repo público de GitHub (cada archivo < 100 MB).
4. En `config.json` pon tu URL en `defaultPacks[0].manifestUrl`:
   `https://raw.githubusercontent.com/USUARIO/REPO/main/manifest.json`
   (o los amigos pueden pegar `USUARIO/REPO` en el botón **+**).

En FancyMenu crea tu menú principal con un botón con la acción de unirse a un servidor (ahí va la IP) y lo guardas en la config del modpack. Cuando cambies algo, repite 2 y 3: a todos se les actualiza al darle Play.

`keepLocal` en `pack.json` lista archivos que NO se pisan si el jugador ya los tiene (por defecto `options.txt` y `servers.dat`).

## Generar los instaladores
No se compila a mano: sube esta carpeta a GitHub y en la pestaña **Actions → Build launcher → Run workflow**. Al terminar descargas:
- **Windows:** `Cachusafio-X-portable.exe` (un solo archivo, sin instalar) y `Cachusafio-Setup-X.exe` (instalador).
- **Linux:** `Cachusafio-X-linux.AppImage` y un `.tar.gz`.

O local: `npm install` y `npm run dist:win` (en Windows) / `npm run dist:linux` (en Linux). `npm start` para probar.

## Linux / Arch
Linux no ejecuta `.exe`; el equivalente es el AppImage:
```
chmod +x Cachusafio-*-linux.AppImage && ./Cachusafio-*-linux.AppImage
```
Necesita `fuse2` (`sudo pacman -S fuse2`). Si no quieres instalarlo, extrae el `.tar.gz` y ejecuta `cachusafio`. Si no abre, prueba con `--no-sandbox`.

## Datos
Todo en `%APPDATA%\.cachusafio` (Windows) o `~/.config/.cachusafio` (Linux). Cada modpack tiene su carpeta en `instances/`. Último log del juego: `latest.log`.

## Nota
El modo offline sirve para servidores con `online-mode=false`; un servidor premium lo rechazará.
