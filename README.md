# Cachusafio Launcher 3.3

Launcher de modpacks para Windows 10/11 y Linux (Arch y otras). Tus amigos lo abren, inician sesión (cuenta Microsoft u offline) y le dan **Play**. No hay IP en el launcher: el botón para entrar al servidor lo pones tú en el menú principal con **FancyMenu**, dentro del modpack.

## Qué hace
- Varios modpacks en la barra lateral (botón **+** para agregar otro con su enlace o `usuario/repo`).
- Login con Microsoft (varias cuentas) o modo offline con nombre de jugador.
- Descarga solo Java, Fabric/Quilt/Forge/NeoForge, Minecraft y el modpack. Actualiza solo lo que cambió.
- Descargas a prueba de red mala: reanuda si se corta, detecta cuando se queda pegada, reintenta con espera, baja los archivos grandes con varias conexiones y verifica cada archivo (hash) antes de usarlo. Si algo falla, el error dice qué archivo y por qué, y no tumba al resto.
- Icono, fondo y logo de cada modpack vienen del propio modpack.
- Se actualiza solo: el instalador de Windows y el AppImage descargan la versión nueva en segundo plano y piden reiniciar. El `.exe` portable y el `.tar.gz` solo avisan con un enlace.
- **Novedades**: muestra qué mods se agregaron, actualizaron o quitaron desde la última vez que jugaste, más las notas que escribas en `changelog`.
- **Estado del servidor**: con `server` en `pack.json` muestra si está prendido y cuántos jugadores hay.
- Cada jugador puede cambiar el icono, fondo, logo y color de un modpack en **Ajustes → Personalizar** (solo en su PC).
- **Quién está conectado**: muestra las caras de los jugadores al lado del estado del servidor.
- **Vestidor**: cada jugador elige su skin (archivo .png, o copiada de un jugador premium) y una de las 45 capas oficiales, con vista 3D. Se ve dentro del servidor —también sin premium— gracias al mod `cachusafio-skins` del modpack, que **también tiene que estar en la carpeta `mods/` del servidor**.
- **Discord**: tus amigos ven "Jugando Cachusafio" en tu perfil (ver abajo cómo activarlo).
- **Menú del juego listo**: `node tools/make-menu.js <carpeta-del-modpack> [ip]` genera el menú principal de FancyMenu (fondo, logo, *Jugar en Cachusafio*, Opciones, Salir). Sin IP, el botón abre la lista de servidores; con IP, entra directo.
- Si Minecraft se cierra con error, muestra las últimas líneas del log para copiarlas y pedir ayuda.
- Botón para forzar el cierre del juego y opción para ocultar el launcher mientras juegas.
- La sesión de Microsoft se guarda cifrada con el llavero del sistema.
- Idiomas: Español / English.

## Discord Rich Presence
Ya viene activado con la app de Discord de Cachusafio (`discordClientId` en `config.json`). Cada jugador puede apagarlo en **Ajustes → Mostrar en Discord**.

## Crear el modpack (tú, una vez)
1. Carpeta `modpack/` con `mods/`, `config/` (incluye `config/fancymenu/`), `resourcepacks/`… y un `pack.json` (copia `tools/pack.example.json`).
   Imágenes opcionales en la misma carpeta (las ven todos):
   - `icon.png`: cuadrado, 256×256, para la barra lateral.
   - `background.png` (o `.jpg`/`.webp`): 1920×1080; el texto va abajo a la izquierda, así que deja esa zona tranquila.
   - `logo.png`: PNG con fondo transparente, ~1000×300; reemplaza el nombre grande.
   Campos útiles de `pack.json`: `accent` (color, ej. `"#e0112b"`), `server` (`"ip:puerto"`), `changelog` (lista de notas de esta versión), `externalUrls` (mods de más de 100 MB alojados en un Release).
2. `node tools/generate-manifest.js ./modpack`
3. Sube la carpeta completa a un repo público de GitHub (cada archivo < 100 MB).
   Los archivos de más de 100 MB no caben en el repo: súbelos como archivo de un **Release** y pon su enlace en el campo `"url"` de esa entrada del manifest. Opcional: `"urls": ["https://…"]` con enlaces de respaldo; si el primero falla, prueba los demás.
4. En `config.json` pon tu URL en `defaultPacks[0].manifestUrl`:
   `https://raw.githubusercontent.com/USUARIO/REPO/main/manifest.json`
   (o los amigos pueden pegar `USUARIO/REPO` en el botón **+**).

En FancyMenu crea tu menú principal con un botón con la acción de unirse a un servidor (ahí va la IP) y lo guardas en la config del modpack. Cuando cambies algo, repite 2 y 3: a todos se les actualiza al darle Play.

`keepLocal` en `pack.json` lista archivos que NO se pisan si el jugador ya los tiene (por defecto `options.txt` y `servers.dat`).

## Publicar una versión nueva del launcher
1. Cambia lo que quieras y súbelo a `main`.
2. En GitHub: **Releases → Draft a new release**, tag `v3.2.0` (siempre más alto que el anterior), **Publish**.
3. Actions compila y adjunta los instaladores y los `latest*.yml`. Los launchers instalados lo detectan solos al abrirse.

La primera vez, tus amigos tienen que instalar la 3.1 a mano (las versiones anteriores no tenían actualización automática).

## Generar los instaladores
No se compila a mano: crea un tag `vX.Y.Z` (o un Release con ese tag) y GitHub Actions compila y adjunta los instaladores; la versión sale del tag. También puedes ir a **Actions → Build launcher → Run workflow**. Al terminar descargas:
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
