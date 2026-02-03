import { Button } from '@/components/ui/button';

interface TitlePageProps {
  onAddVideos: () => void;
}

/**
 * タイトル画面
 * アプリ名「Video Connector」と「動画を追加する」ボタンのみを表示
 */
export function TitlePage({ onAddVideos }: TitlePageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      <h1 className="text-4xl font-bold">Video Connector</h1>
      <Button onClick={onAddVideos} size="lg">
        動画を追加する
      </Button>
    </div>
  );
}
