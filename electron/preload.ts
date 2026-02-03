import { ipcRenderer, contextBridge } from 'electron'
import { IpcChannels, ElectronAPI, MetadataLoadedPayload, ThumbnailReadyPayload, FFmpegCompletePayload, FFmpegErrorPayload } from './types'
import { FFmpegProgress, FFmpegExportArgs } from '../src/types/video'

// --------- Expose Electron API to the Renderer process ---------
const electronAPI: ElectronAPI = {
  // renderer → main（呼び出し型）
  selectVideos: () => ipcRenderer.invoke(IpcChannels.DIALOG_SELECT_VIDEOS),
  selectOutputFolder: () => ipcRenderer.invoke(IpcChannels.DIALOG_SELECT_OUTPUT_FOLDER),
  exportVideos: (args: FFmpegExportArgs) => ipcRenderer.invoke(IpcChannels.FFMPEG_EXPORT, args),
  openFolder: (folderPath: string) => ipcRenderer.invoke(IpcChannels.SHELL_OPEN_FOLDER, folderPath),

  // main → renderer（イベントリスナー登録）
  onMetadataLoaded: (callback: (payload: MetadataLoadedPayload) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: MetadataLoadedPayload) => callback(payload)
    ipcRenderer.on(IpcChannels.VIDEO_METADATA_LOADED, handler)
    return () => ipcRenderer.off(IpcChannels.VIDEO_METADATA_LOADED, handler)
  },
  onThumbnailReady: (callback: (payload: ThumbnailReadyPayload) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: ThumbnailReadyPayload) => callback(payload)
    ipcRenderer.on(IpcChannels.VIDEO_THUMBNAIL_READY, handler)
    return () => ipcRenderer.off(IpcChannels.VIDEO_THUMBNAIL_READY, handler)
  },
  onProgress: (callback: (progress: FFmpegProgress) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: FFmpegProgress) => callback(progress)
    ipcRenderer.on(IpcChannels.FFMPEG_PROGRESS, handler)
    return () => ipcRenderer.off(IpcChannels.FFMPEG_PROGRESS, handler)
  },
  onComplete: (callback: (payload: FFmpegCompletePayload) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: FFmpegCompletePayload) => callback(payload)
    ipcRenderer.on(IpcChannels.FFMPEG_COMPLETE, handler)
    return () => ipcRenderer.off(IpcChannels.FFMPEG_COMPLETE, handler)
  },
  onError: (callback: (payload: FFmpegErrorPayload) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: FFmpegErrorPayload) => callback(payload)
    ipcRenderer.on(IpcChannels.FFMPEG_ERROR, handler)
    return () => ipcRenderer.off(IpcChannels.FFMPEG_ERROR, handler)
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

