import { useState, useCallback } from 'react';
import { TitlePage, VideoListPage, ProgressPage, CompletePage } from '@/pages';
import { useVideos, useIpc } from '@/hooks';
import { Toaster } from '@/components/ui/sonner';
import './index.css';

type Page = 'title' | 'list' | 'progress' | 'complete';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('title');
  const {
    videos,
    outputDir,
    selectAndAddVideos,
    reorderVideos,
    removeVideo,
    selectOutputDir,
    clearVideos,
  } = useVideos();
  const {
    progress,
    isExporting,
    outputPath,
    error,
    startExport,
    openOutputFolder,
    resetState,
  } = useIpc();

  // 動画追加（タイトル画面から）
  const handleAddVideosFromTitle = useCallback(async () => {
    await selectAndAddVideos();
    setCurrentPage('list');
  }, [selectAndAddVideos]);

  // 動画追加（リスト画面から）
  const handleAddVideosFromList = useCallback(async () => {
    await selectAndAddVideos();
  }, [selectAndAddVideos]);

  // エクスポート開始
  const handleStartExport = useCallback(async () => {
    if (!outputDir || videos.length === 0) return;
    setCurrentPage('progress');
    await startExport(
      videos.map((v) => v.filePath),
      outputDir
    );
  }, [outputDir, videos, startExport]);

  // 出力完了時に完了画面へ遷移
  if (isExporting === false && outputPath && currentPage === 'progress') {
    setCurrentPage('complete');
  }

  // エラー発生時にリスト画面へ戻る
  if (error && currentPage === 'progress') {
    setCurrentPage('list');
    // TODO: エラー表示
  }

  // 出力先フォルダを開く
  const handleOpenFolder = useCallback(() => {
    if (outputPath) {
      const folderPath = outputPath.substring(0, outputPath.lastIndexOf('/'));
      openOutputFolder(folderPath);
    }
  }, [outputPath, openOutputFolder]);

  // 最初に戻る
  const handleBackToStart = useCallback(() => {
    clearVideos();
    resetState();
    setCurrentPage('title');
  }, [clearVideos, resetState]);

  return (
    <>
      {currentPage === 'title' && (
        <TitlePage onAddVideos={handleAddVideosFromTitle} />
      )}
      {currentPage === 'list' && (
        <VideoListPage
          videos={videos}
          outputDir={outputDir}
          onAddVideos={handleAddVideosFromList}
          onReorderVideos={reorderVideos}
          onRemoveVideo={removeVideo}
          onSelectOutputDir={selectOutputDir}
          onStartExport={handleStartExport}
        />
      )}
      {currentPage === 'progress' && <ProgressPage progress={progress} />}
      {currentPage === 'complete' && outputPath && (
        <CompletePage
          outputPath={outputPath}
          onOpenFolder={handleOpenFolder}
          onBackToStart={handleBackToStart}
        />
      )}
      <Toaster />
    </>
  );
}

export default App;
