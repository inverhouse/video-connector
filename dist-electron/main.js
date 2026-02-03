import { dialog, shell, app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
const IpcChannels = {
  // renderer → main（呼び出し型）
  DIALOG_SELECT_VIDEOS: "dialog:selectVideos",
  DIALOG_SELECT_OUTPUT_FOLDER: "dialog:selectOutputFolder",
  FFMPEG_EXPORT: "ffmpeg:export",
  SHELL_OPEN_FOLDER: "shell:openFolder",
  // main → renderer（通知型）
  VIDEO_METADATA_LOADED: "video:metadataLoaded",
  VIDEO_THUMBNAIL_READY: "video:thumbnailReady",
  FFMPEG_PROGRESS: "ffmpeg:progress",
  FFMPEG_COMPLETE: "ffmpeg:complete",
  FFMPEG_ERROR: "ffmpeg:error"
};
async function selectVideos(mainWindow) {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "動画ファイルを選択",
    filters: [
      {
        name: "動画ファイル",
        extensions: ["mts", "m2ts", "mov", "mp4"]
      }
    ],
    properties: ["openFile", "multiSelections"]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths;
}
async function selectOutputFolder(mainWindow) {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "出力先フォルダを選択",
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
}
async function openFolder(folderPath) {
  await shell.openPath(folderPath);
}
function isWindows() {
  return process.platform === "win32";
}
function getFFmpegBasePath() {
  const isDev = !app.isPackaged;
  if (isDev) {
    return path.join(app.getAppPath(), "resources", "ffmpeg");
  } else {
    return path.join(process.resourcesPath, "ffmpeg");
  }
}
function getFFmpegPath() {
  const basePath = getFFmpegBasePath();
  if (isWindows()) {
    return path.join(basePath, "windows", "ffmpeg.exe");
  } else {
    return path.join(basePath, "mac", "ffmpeg");
  }
}
function getFFprobePath() {
  const basePath = getFFmpegBasePath();
  if (isWindows()) {
    return path.join(basePath, "windows", "ffprobe.exe");
  } else {
    return path.join(basePath, "mac", "ffprobe");
  }
}
function getCacheDir() {
  return path.join(app.getPath("userData"), "Cache");
}
function getThumbnailCacheDir() {
  return path.join(getCacheDir(), "thumbnails");
}
function getTempDir() {
  return path.join(getCacheDir(), "temp");
}
async function readMetadata(filePath, mainWindow) {
  const ffprobePath = getFFprobePath();
  return new Promise((resolve, reject) => {
    const args = [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath
    ];
    const ffprobe = spawn(ffprobePath, args);
    let stdout = "";
    let stderr = "";
    ffprobe.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    ffprobe.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    ffprobe.on("close", async (code) => {
      var _a, _b, _c, _d;
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr}`));
        return;
      }
      try {
        const data = JSON.parse(stdout);
        const videoStream = (_a = data.streams) == null ? void 0 : _a.find((s) => s.codec_type === "video");
        const audioStream = (_b = data.streams) == null ? void 0 : _b.find((s) => s.codec_type === "audio");
        let frameRate = 0;
        if (videoStream == null ? void 0 : videoStream.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
          frameRate = den ? num / den : num;
        }
        const stats = await fs.promises.stat(filePath);
        const fileModifiedTime = stats.mtime.toISOString();
        const creationTime = ((_d = (_c = data.format) == null ? void 0 : _c.tags) == null ? void 0 : _d.creation_time) || null;
        const metadata = {
          videoCodec: (videoStream == null ? void 0 : videoStream.codec_name) || "unknown",
          audioCodec: (audioStream == null ? void 0 : audioStream.codec_name) || "unknown",
          width: (videoStream == null ? void 0 : videoStream.width) || 0,
          height: (videoStream == null ? void 0 : videoStream.height) || 0,
          frameRate: Math.round(frameRate * 100) / 100,
          creationTime,
          fileModifiedTime
        };
        const payload = { filePath, metadata };
        mainWindow.webContents.send(IpcChannels.VIDEO_METADATA_LOADED, payload);
        resolve(metadata);
      } catch (error) {
        reject(new Error(`Failed to parse ffprobe output: ${error}`));
      }
    });
  });
}
async function generateThumbnail(filePath, mainWindow) {
  const ffmpegPath = getFFmpegPath();
  const thumbnailDir = getThumbnailCacheDir();
  await fs.promises.mkdir(thumbnailDir, { recursive: true });
  const hash = crypto.createHash("md5").update(filePath).digest("hex");
  const thumbnailPath = path.join(thumbnailDir, `${hash}.jpg`);
  try {
    await fs.promises.access(thumbnailPath);
    const payload = { filePath, thumbnailPath };
    mainWindow.webContents.send(IpcChannels.VIDEO_THUMBNAIL_READY, payload);
    return thumbnailPath;
  } catch {
  }
  return new Promise((resolve, reject) => {
    const args = [
      "-ss",
      "1",
      // 1秒目のフレームを抽出
      "-i",
      filePath,
      "-vframes",
      "1",
      // 1フレームのみ
      "-vf",
      "scale=160:-1",
      // 幅160pxに縮小（アスペクト比維持）
      "-y",
      // 上書き許可
      thumbnailPath
    ];
    const ffmpeg = spawn(ffmpegPath, args);
    let stderr = "";
    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg thumbnail generation failed: ${stderr}`));
        return;
      }
      const payload = { filePath, thumbnailPath };
      mainWindow.webContents.send(IpcChannels.VIDEO_THUMBNAIL_READY, payload);
      resolve(thumbnailPath);
    });
  });
}
function needsConversion(metadata) {
  const targetVideoCodec = "h264";
  const targetAudioCodec = "aac";
  const targetWidth = 1920;
  const targetHeight = 1080;
  const targetFrameRate = 60;
  return metadata.videoCodec.toLowerCase() !== targetVideoCodec || metadata.audioCodec.toLowerCase() !== targetAudioCodec || metadata.width !== targetWidth || metadata.height !== targetHeight || Math.abs(metadata.frameRate - targetFrameRate) > 0.5;
}
async function convertVideo(inputPath, outputPath) {
  const ffmpegPath = getFFmpegPath();
  return new Promise((resolve, reject) => {
    const args = [
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      "-vf",
      "scale=1920:1080",
      "-r",
      "60",
      "-y",
      outputPath
    ];
    const ffmpeg = spawn(ffmpegPath, args);
    let stderr = "";
    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg conversion failed: ${stderr}`));
        return;
      }
      resolve();
    });
  });
}
async function mergeVideos(videoPaths, outputPath) {
  const ffmpegPath = getFFmpegPath();
  const tempDir = getTempDir();
  await fs.promises.mkdir(tempDir, { recursive: true });
  const filelistPath = path.join(tempDir, "filelist.txt");
  const filelistContent = videoPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
  await fs.promises.writeFile(filelistPath, filelistContent);
  return new Promise((resolve, reject) => {
    const args = [
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      filelistPath,
      "-c",
      "copy",
      "-y",
      outputPath
    ];
    const ffmpeg = spawn(ffmpegPath, args);
    let stderr = "";
    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    ffmpeg.on("close", async (code) => {
      try {
        await fs.promises.unlink(filelistPath);
      } catch {
      }
      if (code !== 0) {
        reject(new Error(`ffmpeg merge failed: ${stderr}`));
        return;
      }
      resolve();
    });
  });
}
function generateOutputFileName(outputDir) {
  const now = /* @__PURE__ */ new Date();
  const jstOffset = 9 * 60 * 60 * 1e3;
  const jst = new Date(now.getTime() + jstOffset);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  const hours = String(jst.getUTCHours()).padStart(2, "0");
  const minutes = String(jst.getUTCMinutes()).padStart(2, "0");
  const seconds = String(jst.getUTCSeconds()).padStart(2, "0");
  const baseName = `output_${year}${month}${day}_${hours}${minutes}${seconds}`;
  let outputPath = path.join(outputDir, `${baseName}.mp4`);
  let counter = 2;
  while (fs.existsSync(outputPath)) {
    outputPath = path.join(outputDir, `${baseName}_${counter}.mp4`);
    counter++;
  }
  return outputPath;
}
async function exportVideos(args, metadataMap, mainWindow) {
  const { videoPaths, outputDir } = args;
  const tempDir = getTempDir();
  await fs.promises.mkdir(tempDir, { recursive: true });
  const tempFiles = [];
  try {
    const conversionNeeded = [];
    for (let i = 0; i < videoPaths.length; i++) {
      const metadata = metadataMap.get(videoPaths[i]);
      if (metadata && needsConversion(metadata)) {
        conversionNeeded.push({ index: i, path: videoPaths[i] });
      }
    }
    const totalSteps = conversionNeeded.length + 1;
    let currentStep = 0;
    const pathsForMerge = [...videoPaths];
    for (const item of conversionNeeded) {
      currentStep++;
      const progress2 = {
        stage: "converting",
        current: currentStep,
        total: conversionNeeded.length,
        percent: Math.round(currentStep / totalSteps * 100)
      };
      mainWindow.webContents.send(IpcChannels.FFMPEG_PROGRESS, progress2);
      const tempPath = path.join(tempDir, `temp_${item.index}_${Date.now()}.mp4`);
      await convertVideo(item.path, tempPath);
      tempFiles.push(tempPath);
      pathsForMerge[item.index] = tempPath;
    }
    const progress = {
      stage: "merging",
      current: 1,
      total: 1,
      percent: 100
    };
    mainWindow.webContents.send(IpcChannels.FFMPEG_PROGRESS, progress);
    const outputPath = generateOutputFileName(outputDir);
    await mergeVideos(pathsForMerge, outputPath);
    const completePayload = { outputPath };
    mainWindow.webContents.send(IpcChannels.FFMPEG_COMPLETE, completePayload);
  } catch (error) {
    const errorPayload = {
      message: error instanceof Error ? error.message : String(error)
    };
    mainWindow.webContents.send(IpcChannels.FFMPEG_ERROR, errorPayload);
    throw error;
  } finally {
    for (const tempFile of tempFiles) {
      try {
        await fs.promises.unlink(tempFile);
      } catch {
      }
    }
  }
}
const __dirname$1 = path$1.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path$1.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$1.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$1.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$1.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
const metadataCache = /* @__PURE__ */ new Map();
function createWindow() {
  win = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    icon: path$1.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path$1.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$1.join(RENDERER_DIST, "index.html"));
  }
}
function registerIpcHandlers() {
  ipcMain.handle(IpcChannels.DIALOG_SELECT_VIDEOS, async () => {
    if (!win) return null;
    const filePaths = await selectVideos(win);
    if (filePaths) {
      for (const filePath of filePaths) {
        readMetadata(filePath, win).then((metadata) => {
          metadataCache.set(filePath, metadata);
        }).catch((error) => {
          console.error(`Failed to read metadata for ${filePath}:`, error);
        });
        generateThumbnail(filePath, win).catch((error) => {
          console.error(`Failed to generate thumbnail for ${filePath}:`, error);
        });
      }
    }
    return filePaths;
  });
  ipcMain.handle(IpcChannels.DIALOG_SELECT_OUTPUT_FOLDER, async () => {
    if (!win) return null;
    return selectOutputFolder(win);
  });
  ipcMain.handle(IpcChannels.FFMPEG_EXPORT, async (_event, args) => {
    if (!win) return;
    await exportVideos(args, metadataCache, win);
  });
  ipcMain.handle(IpcChannels.SHELL_OPEN_FOLDER, async (_event, folderPath) => {
    await openFolder(folderPath);
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
