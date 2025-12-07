import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('cinemacore', {
  fileScanner: {
    startScan: (paths: string[]) => ipcRenderer.invoke("cinemacore:startScan", paths),
    getScanJob: (jobId: string) => ipcRenderer.invoke("cinemacore:getScanJob", jobId),
    getScanResults: (jobId: string) => ipcRenderer.invoke("cinemacore:getScanResults", jobId),
  },
  dialog: {
    chooseFolders: () => ipcRenderer.invoke("cinemacore:chooseFolders"),
  },
  media: {
    selectCustomPlayer: () => ipcRenderer.invoke("cinemacore:selectCustomPlayer"),
    playWithSystemDefault: (filePath: string) =>
      ipcRenderer.invoke("cinemacore:playWithSystemDefaultPlayer", filePath),
    playWithCustomPlayer: (playerPath: string, filePath: string) =>
      ipcRenderer.invoke("cinemacore:playWithCustomPlayer", playerPath, filePath),
  },
  settings: {
    getPlaybackSettings: () => ipcRenderer.invoke("cinemacore:getPlaybackSettings"),
    savePlaybackSettings: (settings: any) =>
      ipcRenderer.invoke("cinemacore:savePlaybackSettings", settings),
  },
  deleteFile: async (filePath: string): Promise<boolean> => {
    return await ipcRenderer.invoke("cinemacore:deleteFile", filePath);
  },
  db: {
    getAllFiles: () => ipcRenderer.invoke("cinemacore:db:getAllFiles"),
    upsertFile: (file: any) => ipcRenderer.invoke("cinemacore:db:upsertFile", file),
    hideFile: (id: string) => ipcRenderer.invoke("cinemacore:db:hideFile", id),
    toggleFavorite: (id: string) => ipcRenderer.invoke("cinemacore:db:toggleFavorite", id)
  },
  ping: () => console.log('pong'),
});

