const { contextBridge, ipcRenderer, webUtils } = require('electron');

const inv = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);

contextBridge.exposeInMainWorld('api', {
  getState: inv('state:get'),
  refreshPacks: inv('packs:refresh'),
  addPack: inv('packs:add'),
  removePack: inv('packs:remove'),
  selectPack: inv('packs:select'),
  openFolder: inv('packs:openFolder'),
  loginMicrosoft: inv('auth:microsoft'),
  loginOffline: inv('auth:offline'),
  selectAccount: inv('auth:select'),
  removeAccount: inv('auth:remove'),
  play: inv('game:play'),
  openLog: inv('game:openLog'),
  killGame: inv('game:kill'),
  checkUpdate: inv('app:checkUpdate'),
  installUpdate: inv('app:installUpdate'),
  serverStatus: inv('server:status'),
  customize: inv('packs:customize'),
  adminChoose: inv('admin:choose'),
  adminForget: inv('admin:forget'),
  adminStatus: inv('admin:status'),
  adminAddMods: inv('admin:addMods'),
  adminRemoveMod: inv('admin:removeMod'),
  adminOpenFolder: inv('admin:openFolder'),
  adminPublish: inv('admin:publish'),
  // ruta real de un archivo arrastrado a la ventana (File.path ya no existe en Electron 32+)
  pathForFile: (file) => webUtils.getPathForFile(file),
  setSettings: inv('settings:set'),
  systemInfo: inv('system:info'),
  onStatus: (cb) => ipcRenderer.on('status', (_e, d) => cb(d)),
  onGameState: (cb) => ipcRenderer.on('game-state', (_e, s) => cb(s)),
  onGameError: (cb) => ipcRenderer.on('game-error', (_e, d) => cb(d)),
  onUpdater: (cb) => ipcRenderer.on('updater', (_e, d) => cb(d)),
  onAdminStep: (cb) => ipcRenderer.on('admin-step', (_e, d) => cb(d)),
});
