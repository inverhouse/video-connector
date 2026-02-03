import { VideoItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface VideoListPageProps {
  videos: VideoItem[];
  outputDir: string | null;
  hasMixedSources: boolean;
  onAddVideos: () => void;
  onReorderVideos: (newOrder: VideoItem[]) => void;
  onRemoveVideo: (id: string) => void;
  onSelectOutputDir: () => void;
  onStartExport: () => void;
}

/**
 * 動画リスト画面
 * 動画の並べ替え、追加、出力先設定、エクスポート開始
 */
export function VideoListPage({
  videos,
  outputDir,
  hasMixedSources,
  onAddVideos,
  onReorderVideos,
  onRemoveVideo,
  onSelectOutputDir,
  onStartExport,
}: VideoListPageProps) {
  const canExport = videos.length > 0 && outputDir !== null;

  return (
    <div className="flex flex-col min-h-screen p-6 gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Video Connector</h1>
        <Button onClick={onAddVideos} variant="outline">
          動画を追加する
        </Button>
      </header>

      {/* 異なるソースの動画が混在している場合の警告 */}
      {hasMixedSources && (
        <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            iPhoneで撮影した動画とビデオカメラで撮影した動画が混在しています。
            フォーマットの変換が必要なため、通常より出力に時間がかかる場合があります。
          </AlertDescription>
        </Alert>
      )}

      <main className="flex-1">
        {videos.length === 0 ? (
          <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">動画がありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* TODO: DraggableListコンポーネントを実装 */}
            {videos.map((video) => (
              <div
                key={video.id}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                <div className="w-24 h-16 bg-muted rounded flex items-center justify-center">
                  {video.thumbnailPath ? (
                    <img
                      src={`file://${video.thumbnailPath}`}
                      alt={video.fileName}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">読込中...</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{video.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {video.displayTime || '日時取得中...'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveVideo(video.id)}
                >
                  削除
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-4">
          <Button onClick={onSelectOutputDir} variant="outline">
            出力先を選択
          </Button>
          {outputDir && (
            <span className="text-sm text-muted-foreground truncate max-w-xs">
              {outputDir}
            </span>
          )}
        </div>
        <Button onClick={onStartExport} disabled={!canExport}>
          出力を実行
        </Button>
      </footer>
    </div>
  );
}
