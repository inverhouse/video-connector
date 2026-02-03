import { shell } from 'electron';

/**
 * 出力先フォルダをエクスプローラー/Finderで開く
 */
export async function openFolder(folderPath: string): Promise<void> {
  await shell.openPath(folderPath);
}
