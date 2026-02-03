/**
 * 動画メタデータの型定義
 */
export interface VideoMetadata {
  /** 動画コーデック（例: "h264"） */
  videoCodec: string;
  /** 音声コーデック（例: "aac"） */
  audioCodec: string;
  /** 解像度幅 */
  width: number;
  /** 解像度高さ */
  height: number;
  /** フレームレート */
  frameRate: number;
  /** 撮影日時（ISO 8601）。なければnull */
  creationTime: string | null;
  /** ファイル変更日時（ISO 8601） */
  fileModifiedTime: string;
}

/**
 * 動画リスト項目の型定義
 */
export interface VideoItem {
  /** リスト項目のユニークID */
  id: string;
  /** ファイルパス */
  filePath: string;
  /** ファイル名 */
  fileName: string;
  /** メタデータ（取得中の場合はnull） */
  metadata: VideoMetadata | null;
  /** サムネイルパス（生成中の場合はnull） */
  thumbnailPath: string | null;
  /** 表示する撮影日時（creationTime優先、フォールバックはfileModifiedTime） */
  displayTime: string;
}

/**
 * FFmpegの進行状況
 */
export interface FFmpegProgress {
  /** 処理段階 */
  stage: 'converting' | 'merging';
  /** 現在の処理数 */
  current: number;
  /** 全体の処理数 */
  total: number;
  /** 進行率（0-100） */
  percent: number;
}

/**
 * FFmpegエクスポートの引数
 */
export interface FFmpegExportArgs {
  /** 動画ファイルパスの配列（並び順） */
  videoPaths: string[];
  /** 出力先ディレクトリ */
  outputDir: string;
}
