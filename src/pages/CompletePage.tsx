import { Button } from '@/components/ui/button';

interface CompletePageProps {
  outputPath: string;
  onOpenFolder: () => void;
  onBackToStart: () => void;
}

/**
 * 出力完了画面
 * 完了メッセージと出力先を開くボタンを表示
 */
export function CompletePage({ outputPath, onOpenFolder, onBackToStart }: CompletePageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-green-600">出力が完了しました！</h1>
        <p className="text-muted-foreground">
          出力先: {outputPath}
        </p>
      </div>
      <div className="flex gap-4">
        <Button onClick={onOpenFolder} size="lg">
          出力先を開く
        </Button>
        <Button onClick={onBackToStart} variant="outline" size="lg">
          最初に戻る
        </Button>
      </div>
    </div>
  );
}
