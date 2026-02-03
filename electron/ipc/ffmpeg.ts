import { BrowserWindow } from 'electron';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { getFFmpegPath, getThumbnailCacheDir, getTempDir } from '../utils/platform';
import { IpcChannels, ThumbnailReadyPayload, FFmpegCompletePayload, FFmpegErrorPayload } from '../types';
import { FFmpegProgress, FFmpegExportArgs, VideoMetadata } from '../../src/types/video';

/**
 * サムネイルを生成する
 */
export async function generateThumbnail(
  filePath: string,
  mainWindow: BrowserWindow
): Promise<string> {
  const ffmpegPath = getFFmpegPath();
  const thumbnailDir = getThumbnailCacheDir();

  // キャッシュディレクトリを作成
  await fs.promises.mkdir(thumbnailDir, { recursive: true });

  // ファイルパスからハッシュを生成してファイル名とする
  const hash = crypto.createHash('md5').update(filePath).digest('hex');
  const thumbnailPath = path.join(thumbnailDir, `${hash}.jpg`);

  // 既にサムネイルが存在する場合はスキップ
  try {
    await fs.promises.access(thumbnailPath);
    const payload: ThumbnailReadyPayload = { filePath, thumbnailPath };
    mainWindow.webContents.send(IpcChannels.VIDEO_THUMBNAIL_READY, payload);
    return thumbnailPath;
  } catch {
    // ファイルが存在しない場合は生成する
  }

  return new Promise((resolve, reject) => {
    const args = [
      '-ss', '1',           // 1秒目のフレームを抽出
      '-i', filePath,
      '-vframes', '1',      // 1フレームのみ
      '-vf', 'scale=160:-1', // 幅160pxに縮小（アスペクト比維持）
      '-y',                 // 上書き許可
      thumbnailPath,
    ];

    const ffmpeg = spawn(ffmpegPath, args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg thumbnail generation failed: ${stderr}`));
        return;
      }

      const payload: ThumbnailReadyPayload = { filePath, thumbnailPath };
      mainWindow.webContents.send(IpcChannels.VIDEO_THUMBNAIL_READY, payload);
      resolve(thumbnailPath);
    });
  });
}

/**
 * 動画が変換が必要かどうかを判定する
 */
export function needsConversion(metadata: VideoMetadata): boolean {
  const targetVideoCodec = 'h264';
  const targetAudioCodec = 'aac';
  const targetWidth = 1920;
  const targetHeight = 1080;
  const targetFrameRate = 60;

  return (
    metadata.videoCodec.toLowerCase() !== targetVideoCodec ||
    metadata.audioCodec.toLowerCase() !== targetAudioCodec ||
    metadata.width !== targetWidth ||
    metadata.height !== targetHeight ||
    Math.abs(metadata.frameRate - targetFrameRate) > 0.5
  );
}

/**
 * 動画を変換する
 */
async function convertVideo(
  inputPath: string,
  outputPath: string
): Promise<void> {
  const ffmpegPath = getFFmpegPath();

  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-vf', 'scale=1920:1080',
      '-r', '60',
      '-y',
      outputPath,
    ];

    const ffmpeg = spawn(ffmpegPath, args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg conversion failed: ${stderr}`));
        return;
      }
      resolve();
    });
  });
}

/**
 * 動画を結合する
 */
async function mergeVideos(
  videoPaths: string[],
  outputPath: string
): Promise<void> {
  const ffmpegPath = getFFmpegPath();
  const tempDir = getTempDir();
  await fs.promises.mkdir(tempDir, { recursive: true });

  // filelist.txtを生成
  const filelistPath = path.join(tempDir, 'filelist.txt');
  const filelistContent = videoPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  await fs.promises.writeFile(filelistPath, filelistContent);

  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'concat',
      '-safe', '0',
      '-i', filelistPath,
      '-c', 'copy',
      '-y',
      outputPath,
    ];

    const ffmpeg = spawn(ffmpegPath, args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', async (code) => {
      // filelistを削除
      try {
        await fs.promises.unlink(filelistPath);
      } catch {
        // 削除失敗は無視
      }

      if (code !== 0) {
        reject(new Error(`ffmpeg merge failed: ${stderr}`));
        return;
      }
      resolve();
    });
  });
}

/**
 * 出力ファイル名を生成する（日本時間）
 */
function generateOutputFileName(outputDir: string): string {
  const now = new Date();
  // 日本時間（UTC+9）に変換
  const jstOffset = 9 * 60 * 60 * 1000;
  const jst = new Date(now.getTime() + jstOffset);
  
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jst.getUTCDate()).padStart(2, '0');
  const hours = String(jst.getUTCHours()).padStart(2, '0');
  const minutes = String(jst.getUTCMinutes()).padStart(2, '0');
  const seconds = String(jst.getUTCSeconds()).padStart(2, '0');

  const baseName = `output_${year}${month}${day}_${hours}${minutes}${seconds}`;
  let outputPath = path.join(outputDir, `${baseName}.mp4`);
  
  // 同名ファイルが存在する場合は連番を付与
  let counter = 2;
  while (fs.existsSync(outputPath)) {
    outputPath = path.join(outputDir, `${baseName}_${counter}.mp4`);
    counter++;
  }

  return outputPath;
}

/**
 * 動画をエクスポートする（変換＋結合）
 */
export async function exportVideos(
  args: FFmpegExportArgs,
  metadataMap: Map<string, VideoMetadata>,
  mainWindow: BrowserWindow
): Promise<void> {
  const { videoPaths, outputDir } = args;
  const tempDir = getTempDir();
  await fs.promises.mkdir(tempDir, { recursive: true });

  const tempFiles: string[] = [];

  try {
    // 変換が必要な動画を特定
    const conversionNeeded: { index: number; path: string }[] = [];
    for (let i = 0; i < videoPaths.length; i++) {
      const metadata = metadataMap.get(videoPaths[i]);
      if (metadata && needsConversion(metadata)) {
        conversionNeeded.push({ index: i, path: videoPaths[i] });
      }
    }

    const totalSteps = conversionNeeded.length + 1; // 変換数 + 結合1
    let currentStep = 0;

    // 結合用のパスリストを作成
    const pathsForMerge = [...videoPaths];

    // 変換処理
    for (const item of conversionNeeded) {
      currentStep++;
      const progress: FFmpegProgress = {
        stage: 'converting',
        current: currentStep,
        total: conversionNeeded.length,
        percent: Math.round((currentStep / totalSteps) * 100),
      };
      mainWindow.webContents.send(IpcChannels.FFMPEG_PROGRESS, progress);

      const tempPath = path.join(tempDir, `temp_${item.index}_${Date.now()}.mp4`);
      await convertVideo(item.path, tempPath);
      tempFiles.push(tempPath);
      pathsForMerge[item.index] = tempPath;
    }

    // 結合処理
    const progress: FFmpegProgress = {
      stage: 'merging',
      current: 1,
      total: 1,
      percent: 100,
    };
    mainWindow.webContents.send(IpcChannels.FFMPEG_PROGRESS, progress);

    const outputPath = generateOutputFileName(outputDir);
    await mergeVideos(pathsForMerge, outputPath);

    // 完了通知
    const completePayload: FFmpegCompletePayload = { outputPath };
    mainWindow.webContents.send(IpcChannels.FFMPEG_COMPLETE, completePayload);
  } catch (error) {
    const errorPayload: FFmpegErrorPayload = {
      message: error instanceof Error ? error.message : String(error),
    };
    mainWindow.webContents.send(IpcChannels.FFMPEG_ERROR, errorPayload);
    throw error;
  } finally {
    // 一時ファイルを削除
    for (const tempFile of tempFiles) {
      try {
        await fs.promises.unlink(tempFile);
      } catch {
        // 削除失敗は無視
      }
    }
  }
}
