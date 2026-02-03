import { useState, useCallback, useEffect } from 'react';
import { FFmpegProgress } from '@/types';

/**
 * FFmpegのIPC通信を抽象化するフック
 */
export function useIpc() {
  const [progress, setProgress] = useState<FFmpegProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // プログレス更新
  useEffect(() => {
    const unsubscribe = window.electronAPI.onProgress((progressData) => {
      setProgress(progressData);
    });
    return unsubscribe;
  }, []);

  // 完了通知
  useEffect(() => {
    const unsubscribe = window.electronAPI.onComplete((payload) => {
      setIsExporting(false);
      setOutputPath(payload.outputPath);
    });
    return unsubscribe;
  }, []);

  // エラー通知
  useEffect(() => {
    const unsubscribe = window.electronAPI.onError((payload) => {
      setIsExporting(false);
      setError(payload.message);
    });
    return unsubscribe;
  }, []);

  // エクスポート開始
  const startExport = useCallback(async (videoPaths: string[], outputDir: string) => {
    setIsExporting(true);
    setProgress(null);
    setOutputPath(null);
    setError(null);

    try {
      await window.electronAPI.exportVideos({ videoPaths, outputDir });
    } catch (err) {
      setIsExporting(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // 出力先フォルダを開く
  const openOutputFolder = useCallback(async (folderPath: string) => {
    await window.electronAPI.openFolder(folderPath);
  }, []);

  // 状態をリセット
  const resetState = useCallback(() => {
    setProgress(null);
    setIsExporting(false);
    setOutputPath(null);
    setError(null);
  }, []);

  return {
    progress,
    isExporting,
    outputPath,
    error,
    startExport,
    openOutputFolder,
    resetState,
  };
}
