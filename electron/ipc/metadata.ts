import { BrowserWindow } from 'electron';
import { spawn } from 'child_process';
import * as fs from 'fs';
import { getFFprobePath } from '../utils/platform';
import { IpcChannels, MetadataLoadedPayload } from '../types';
import { VideoMetadata } from '../../src/types/video';

/**
 * 動画ファイルのメタデータを読み取る
 */
export async function readMetadata(
  filePath: string,
  mainWindow: BrowserWindow
): Promise<VideoMetadata> {
  const ffprobePath = getFFprobePath();

  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];

    const ffprobe = spawn(ffprobePath, args);
    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffprobe.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
        const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');

        // フレームレートをパース（例: "30000/1001" → 29.97）
        let frameRate = 0;
        if (videoStream?.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
          frameRate = den ? num / den : num;
        }

        // ファイルの変更日時を取得
        const stats = await fs.promises.stat(filePath);
        const fileModifiedTime = stats.mtime.toISOString();

        // 撮影日時を取得（メタデータから、なければnull）
        const creationTime = data.format?.tags?.creation_time || null;

        const metadata: VideoMetadata = {
          videoCodec: videoStream?.codec_name || 'unknown',
          audioCodec: audioStream?.codec_name || 'unknown',
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
          frameRate: Math.round(frameRate * 100) / 100,
          creationTime,
          fileModifiedTime,
        };

        // メタデータ読み込み完了を通知
        const payload: MetadataLoadedPayload = { filePath, metadata };
        mainWindow.webContents.send(IpcChannels.VIDEO_METADATA_LOADED, payload);

        resolve(metadata);
      } catch (error) {
        reject(new Error(`Failed to parse ffprobe output: ${error}`));
      }
    });
  });
}
