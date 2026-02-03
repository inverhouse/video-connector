"use strict";
const electron = require("electron");
const IpcChannels = {
  // renderer → main（呼び出し型）
  DIALOG_SELECT_VIDEOS: "dialog:selectVideos",
  DIALOG_SELECT_OUTPUT_FOLDER: "dialog:selectOutputFolder",
  FFMPEG_EXPORT: "ffmpeg:export",
  SHELL_OPEN_FOLDER: "shell:openFolder",
  // main → renderer（通知型）
  VIDEO_METADATA_LOADED: "video:metadataLoaded",
  VIDEO_THUMBNAIL_READY: "video:thumbnailReady",
  FFMPEG_PROGRESS: "ffmpeg:progress",
  FFMPEG_COMPLETE: "ffmpeg:complete",
  FFMPEG_ERROR: "ffmpeg:error"
};
const electronAPI = {
  // renderer → main（呼び出し型）
  selectVideos: () => electron.ipcRenderer.invoke(IpcChannels.DIALOG_SELECT_VIDEOS),
  selectOutputFolder: () => electron.ipcRenderer.invoke(IpcChannels.DIALOG_SELECT_OUTPUT_FOLDER),
  exportVideos: (args) => electron.ipcRenderer.invoke(IpcChannels.FFMPEG_EXPORT, args),
  openFolder: (folderPath) => electron.ipcRenderer.invoke(IpcChannels.SHELL_OPEN_FOLDER, folderPath),
  // main → renderer（イベントリスナー登録）
  onMetadataLoaded: (callback) => {
    const handler = (_event, payload) => callback(payload);
    electron.ipcRenderer.on(IpcChannels.VIDEO_METADATA_LOADED, handler);
    return () => electron.ipcRenderer.off(IpcChannels.VIDEO_METADATA_LOADED, handler);
  },
  onThumbnailReady: (callback) => {
    const handler = (_event, payload) => callback(payload);
    electron.ipcRenderer.on(IpcChannels.VIDEO_THUMBNAIL_READY, handler);
    return () => electron.ipcRenderer.off(IpcChannels.VIDEO_THUMBNAIL_READY, handler);
  },
  onProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    electron.ipcRenderer.on(IpcChannels.FFMPEG_PROGRESS, handler);
    return () => electron.ipcRenderer.off(IpcChannels.FFMPEG_PROGRESS, handler);
  },
  onComplete: (callback) => {
    const handler = (_event, payload) => callback(payload);
    electron.ipcRenderer.on(IpcChannels.FFMPEG_COMPLETE, handler);
    return () => electron.ipcRenderer.off(IpcChannels.FFMPEG_COMPLETE, handler);
  },
  onError: (callback) => {
    const handler = (_event, payload) => callback(payload);
    electron.ipcRenderer.on(IpcChannels.FFMPEG_ERROR, handler);
    return () => electron.ipcRenderer.off(IpcChannels.FFMPEG_ERROR, handler);
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
