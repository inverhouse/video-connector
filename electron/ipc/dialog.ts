import { dialog, BrowserWindow } from 'electron';

/**
 * 動画ファイルの選択ダイアログを開く
 */
export async function selectVideos(mainWindow: BrowserWindow): Promise<string[] | null> {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '動画ファイルを選択',
    filters: [
      {
        name: '動画ファイル',
        extensions: ['mts', 'm2ts', 'mov', 'mp4'],
      },
    ],
    properties: ['openFile', 'multiSelections'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths;
}

/**
 * 出力先フォルダの選択ダイアログを開く
 */
export async function selectOutputFolder(mainWindow: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '出力先フォルダを選択',
    properties: ['openDirectory', 'createDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}
