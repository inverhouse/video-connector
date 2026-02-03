import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { IpcChannels } from './types'
import { selectVideos, selectOutputFolder } from './ipc/dialog'
import { openFolder } from './ipc/shell'
import { readMetadata } from './ipc/metadata'
import { generateThumbnail, exportVideos } from './ipc/ffmpeg'
import { VideoMetadata, FFmpegExportArgs } from '../src/types/video'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

// 動画メタデータのキャッシュ（エクスポート時のスキップ判定に使用）
const metadataCache = new Map<string, VideoMetadata>()

function createWindow() {
  win = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// IPC ハンドラーを登録
function registerIpcHandlers() {
  // 動画ファイル選択ダイアログ
  ipcMain.handle(IpcChannels.DIALOG_SELECT_VIDEOS, async () => {
    if (!win) return null
    const filePaths = await selectVideos(win)
    
    if (filePaths) {
      // 選択された動画のメタデータとサムネイルを非同期で取得
      for (const filePath of filePaths) {
        // メタデータ取得
        readMetadata(filePath, win).then((metadata) => {
          metadataCache.set(filePath, metadata)
        }).catch((error) => {
          console.error(`Failed to read metadata for ${filePath}:`, error)
        })

        // サムネイル生成
        generateThumbnail(filePath, win).catch((error) => {
          console.error(`Failed to generate thumbnail for ${filePath}:`, error)
        })
      }
    }
    
    return filePaths
  })

  // 出力先フォルダ選択ダイアログ
  ipcMain.handle(IpcChannels.DIALOG_SELECT_OUTPUT_FOLDER, async () => {
    if (!win) return null
    return selectOutputFolder(win)
  })

  // 動画エクスポート
  ipcMain.handle(IpcChannels.FFMPEG_EXPORT, async (_event, args: FFmpegExportArgs) => {
    if (!win) return
    await exportVideos(args, metadataCache, win)
  })

  // フォルダを開く
  ipcMain.handle(IpcChannels.SHELL_OPEN_FOLDER, async (_event, folderPath: string) => {
    await openFolder(folderPath)
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
})
