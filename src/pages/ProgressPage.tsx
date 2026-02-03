import { FFmpegProgress } from '@/types';
import { Progress } from '@/components/ui/progress';

interface ProgressPageProps {
  progress: FFmpegProgress | null;
}

/**
 * 出力待機画面
 * プログレスバーと処理状況を表示
 */
export function ProgressPage({ progress }: ProgressPageProps) {
  // 処理状況テキストを生成
  const getStatusText = () => {
    if (!progress) return '準備中...';

    if (progress.stage === 'converting') {
      return `変換中（${progress.current}/${progress.total}）…`;
    } else {
      return '結合中…';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <h1 className="text-2xl font-bold">出力中</h1>
      <div className="w-full max-w-md space-y-4">
        <Progress value={progress?.percent ?? 0} className="h-4" />
        <p className="text-center text-muted-foreground">{getStatusText()}</p>
      </div>
    </div>
  );
}
