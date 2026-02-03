import { useState, useCallback, useEffect } from 'react';
import { VideoItem } from '@/types';

/**
 * 動画リストの状態管理フック
 */
export function useVideos() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [outputDir, setOutputDir] = useState<string | null>(null);

  // メタデータ読み込み完了時のハンドラ
  useEffect(() => {
    const unsubscribe = window.electronAPI.onMetadataLoaded((payload) => {
      setVideos((prev) =>
        prev.map((video) => {
          if (video.filePath === payload.filePath) {
            const displayTime =
              payload.metadata.creationTime || payload.metadata.fileModifiedTime;
            return {
              ...video,
              metadata: payload.metadata,
              displayTime,
            };
          }
          return video;
        })
      );
    });

    return unsubscribe;
  }, []);

  // サムネイル生成完了時のハンドラ
  useEffect(() => {
    const unsubscribe = window.electronAPI.onThumbnailReady((payload) => {
      setVideos((prev) =>
        prev.map((video) => {
          if (video.filePath === payload.filePath) {
            return {
              ...video,
              thumbnailPath: payload.thumbnailPath,
            };
          }
          return video;
        })
      );
    });

    return unsubscribe;
  }, []);

  // 動画を選択して追加
  const selectAndAddVideos = useCallback(async () => {
    const filePaths = await window.electronAPI.selectVideos();
    if (!filePaths) return;

    // 既存のパスを取得
    const existingPaths = new Set(videos.map((v) => v.filePath));

    // 新規動画のみ追加
    const newVideos: VideoItem[] = filePaths
      .filter((filePath) => !existingPaths.has(filePath))
      .map((filePath) => ({
        id: crypto.randomUUID(),
        filePath,
        fileName: filePath.split(/[/\\]/).pop() || '',
        metadata: null,
        thumbnailPath: null,
        displayTime: '',
      }));

    if (newVideos.length > 0) {
      setVideos((prev) => [...prev, ...newVideos]);
    }
  }, [videos]);

  // 動画リストを並び替え
  const reorderVideos = useCallback((newOrder: VideoItem[]) => {
    setVideos(newOrder);
  }, []);

  // 動画を削除
  const removeVideo = useCallback((id: string) => {
    setVideos((prev) => prev.filter((video) => video.id !== id));
  }, []);

  // 出力先フォルダを選択
  const selectOutputDir = useCallback(async () => {
    const selectedDir = await window.electronAPI.selectOutputFolder();
    if (selectedDir) {
      setOutputDir(selectedDir);
    }
  }, []);

  // リストをクリア
  const clearVideos = useCallback(() => {
    setVideos([]);
    setOutputDir(null);
  }, []);

  return {
    videos,
    outputDir,
    selectAndAddVideos,
    reorderVideos,
    removeVideo,
    selectOutputDir,
    clearVideos,
  };
}
