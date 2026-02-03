import { VideoMetadata, FFmpegProgress, FFmpegExportArgs } from '../src/types/video';

/**
 * IPC通信のチャンネル名定義
 */
export const IpcChannels = {
  // renderer → main（呼び出し型）
  DIALOG_SELECT_VIDEOS: 'dialog:selectVideos',
  DIALOG_SELECT_OUTPUT_FOLDER: 'dialog:selectOutputFolder',
  FFMPEG_EXPORT: 'ffmpeg:export',
  SHELL_OPEN_FOLDER: 'shell:openFolder',
  
  // main → renderer（通知型）
  VIDEO_METADATA_LOADED: 'video:metadataLoaded',
  VIDEO_THUMBNAIL_READY: 'video:thumbnailReady',
  FFMPEG_PROGRESS: 'ffmpeg:progress',
  FFMPEG_COMPLETE: 'ffmpeg:complete',
  FFMPEG_ERROR: 'ffmpeg:error',
} as const;

/**
 * メタデータ読み込み完了イベントのペイロード
 */
export interface MetadataLoadedPayload {
  filePath: string;
  metadata: VideoMetadata;
}

/**
 * サムネイル生成完了イベントのペイロード
 */
export interface ThumbnailReadyPayload {
  filePath: string;
  thumbnailPath: string;
}

/**
 * FFmpegエラーイベントのペイロード
 */
export interface FFmpegErrorPayload {
  message: string;
}

/**
 * FFmpeg完了イベントのペイロード
 */
export interface FFmpegCompletePayload {
  outputPath: string;
}

/**
 * Electron APIの型定義（preload経由でrendererに公開）
 */
export interface ElectronAPI {
  // renderer → main
  selectVideos: () => Promise<string[] | null>;
  selectOutputFolder: () => Promise<string | null>;
  exportVideos: (args: FFmpegExportArgs) => Promise<void>;
  openFolder: (folderPath: string) => Promise<void>;
  
  // main → renderer（イベントリスナー登録）
  onMetadataLoaded: (callback: (payload: MetadataLoadedPayload) => void) => () => void;
  onThumbnailReady: (callback: (payload: ThumbnailReadyPayload) => void) => () => void;
  onProgress: (callback: (progress: FFmpegProgress) => void) => () => void;
  onComplete: (callback: (payload: FFmpegCompletePayload) => void) => () => void;
  onError: (callback: (payload: FFmpegErrorPayload) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
