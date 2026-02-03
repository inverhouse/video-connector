import { VideoMetadata } from './video';

/**
 * 動画のソース種別
 */
export type VideoSource = 'iphone' | 'handycam' | 'unknown';

/**
 * メタデータから動画のソースを判定する
 * 
 * iPhone: MOV/MP4, H.264/H.265(HEVC), AAC
 * Sony ハンディカム(AVCHD): MTS/M2TS/MP4, H.264, AAC/AC3
 */
export function detectVideoSource(filePath: string, metadata: VideoMetadata): VideoSource {
  const ext = filePath.toLowerCase().split('.').pop() || '';
  const videoCodec = metadata.videoCodec.toLowerCase();
  const audioCodec = metadata.audioCodec.toLowerCase();

  // MTS/M2TSはほぼ確実にハンディカム（AVCHD）
  if (ext === 'mts' || ext === 'm2ts') {
    return 'handycam';
  }

  // HEVC(H.265)はiPhoneの可能性が高い
  if (videoCodec === 'hevc' || videoCodec === 'h265') {
    return 'iphone';
  }

  // AC3音声はハンディカムの可能性が高い
  if (audioCodec === 'ac3' || audioCodec === 'ac-3') {
    return 'handycam';
  }

  // MOVファイルはiPhoneの可能性が高い
  if (ext === 'mov') {
    return 'iphone';
  }

  // MP4 + H.264 + AAC の場合は判定困難
  // アスペクト比やフレームレートで推測
  if (ext === 'mp4' && (videoCodec === 'h264' || videoCodec === 'avc1')) {
    // 1080p/60fps以外の解像度・フレームレートはハンディカムの可能性
    // iPhoneは通常1080p/30fps, 1080p/60fps, 4Kなど
    // ハンディカムは1080p/60i(実質30fps)など
    
    // フレームレートが29.97付近はハンディカムの可能性
    if (Math.abs(metadata.frameRate - 29.97) < 0.1) {
      return 'handycam';
    }
  }

  return 'unknown';
}

/**
 * 動画リストにiPhoneとハンディカムの動画が混在しているかチェック
 */
export function hasSourceMismatch(
  videos: Array<{ filePath: string; metadata: VideoMetadata | null }>
): boolean {
  const sources = new Set<VideoSource>();

  for (const video of videos) {
    if (video.metadata) {
      const source = detectVideoSource(video.filePath, video.metadata);
      if (source !== 'unknown') {
        sources.add(source);
      }
    }
  }

  // iPhoneとhandycamの両方が含まれていれば混在
  return sources.has('iphone') && sources.has('handycam');
}
