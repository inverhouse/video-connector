import * as path from 'path';
import { app } from 'electron';

/**
 * 現在のプラットフォームを判定
 */
export function isMac(): boolean {
  return process.platform === 'darwin';
}

export function isWindows(): boolean {
  return process.platform === 'win32';
}

/**
 * FFmpegバイナリのベースパスを取得
 * 開発時と本番（パッケージ後）で異なるパスを返す
 */
function getFFmpegBasePath(): string {
  const isDev = !app.isPackaged;
  
  if (isDev) {
    // 開発時: プロジェクトルートのresourcesフォルダ
    return path.join(app.getAppPath(), 'resources', 'ffmpeg');
  } else {
    // 本番時: パッケージ内のresourcesフォルダ
    return path.join(process.resourcesPath, 'ffmpeg');
  }
}

/**
 * FFmpegバイナリのパスを取得
 */
export function getFFmpegPath(): string {
  const basePath = getFFmpegBasePath();
  
  if (!app.isPackaged) {
    // 開発時: mac/ or windows/ サブフォルダを含む
    if (isWindows()) {
      return path.join(basePath, 'windows', 'ffmpeg.exe');
    } else {
      return path.join(basePath, 'mac', 'ffmpeg');
    }
  } else {
    // 本番時: extraResourcesでフラットにコピーされる
    if (isWindows()) {
      return path.join(basePath, 'ffmpeg.exe');
    } else {
      return path.join(basePath, 'ffmpeg');
    }
  }
}

/**
 * FFprobeバイナリのパスを取得
 */
export function getFFprobePath(): string {
  const basePath = getFFmpegBasePath();
  
  if (!app.isPackaged) {
    // 開発時: mac/ or windows/ サブフォルダを含む
    if (isWindows()) {
      return path.join(basePath, 'windows', 'ffprobe.exe');
    } else {
      return path.join(basePath, 'mac', 'ffprobe');
    }
  } else {
    // 本番時: extraResourcesでフラットにコピーされる
    if (isWindows()) {
      return path.join(basePath, 'ffprobe.exe');
    } else {
      return path.join(basePath, 'ffprobe');
    }
  }
}

/**
 * アプリのキャッシュディレクトリを取得
 */
export function getCacheDir(): string {
  return path.join(app.getPath('userData'), 'Cache');
}

/**
 * サムネイルのキャッシュディレクトリを取得
 */
export function getThumbnailCacheDir(): string {
  return path.join(getCacheDir(), 'thumbnails');
}

/**
 * 一時ファイルのディレクトリを取得
 */
export function getTempDir(): string {
  return path.join(getCacheDir(), 'temp');
}
