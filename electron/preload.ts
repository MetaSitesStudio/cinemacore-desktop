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
    getTrailer: (id: string) => ipcRenderer.invoke("cinemacore:trailer:get", id),
  },
  settings: {
    getPlaybackSettings: () => ipcRenderer.invoke("cinemacore:getPlaybackSettings"),
    savePlaybackSettings: (settings: any) =>
      ipcRenderer.invoke("cinemacore:savePlaybackSettings", settings),
    saveSetting: (key: string, value: string) => ipcRenderer.invoke("cinemacore:saveSetting", key, value),
    getSetting: (key: string) => ipcRenderer.invoke("cinemacore:getSetting", key),
    getPairingCode: () => ipcRenderer.invoke("cinemacore:getPairingCode"),
  },
  library: {
    getFolders: () => ipcRenderer.invoke("cinemacore:library:getFolders"),
    addFolder: () => ipcRenderer.invoke("cinemacore:library:addFolder"),
    removeFolder: (folderId: string, deleteFiles: boolean) => 
      ipcRenderer.invoke("cinemacore:library:removeFolder", folderId, deleteFiles),
    rescanFolder: (folderId: string) => ipcRenderer.invoke("cinemacore:library:rescanFolder", folderId),
    reset: () => ipcRenderer.invoke("cinemacore:library:reset"),
    getDuplicates: () => ipcRenderer.invoke("cinemacore:library:getDuplicates"),
    removeFile: (fileId: string) => ipcRenderer.invoke("cinemacore:library:removeFile", fileId),
    searchMedia: (payload: any) => ipcRenderer.invoke("cinemacore:library:searchMedia", payload),
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
  onScanProgress: (callback: (event: any, payload: any) => void) => {
    const subscription = (_event: any, payload: any) => callback(_event, payload);
    ipcRenderer.on("cinemacore:library:scanProgress", subscription);
    return () => ipcRenderer.removeListener("cinemacore:library:scanProgress", subscription);
  },
  ping: () => console.log('pong'),
});

