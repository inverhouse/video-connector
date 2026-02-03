# Video Connector — 詳細要件定義書

**作成日:** 2026-02-03  
**バージョン:** 1.0.0

---

## 1. プロジェクト概要

| 項目 | 内容 |
|---|---|
| アプリ名 | Video Connector |
| 目的 | 複数の動画ファイルを並べ替え・結合し、1080p/60fps/MP4で出力するデスクトップアプリ |
| プラットフォーム | Windows・macOS（両方で動作）|
| コア技術 | Electron + TypeScript + React + FFmpeg |

---

## 2. 技術スタック

### 2.1 プロジェクト構成

| 技術 | バージョン・詳細 |
|---|---|
| Electron | electron-viteでプロジェクト生成 |
| TypeScript | プロジェクト全体で使用 |
| React | renderer processのUI構築 |
| Vite | ビルドツール |
| FFmpeg | 動画の変換・結合・サムネイル生成・メタデータ読み取り。electron-builderで同梱 |
| shadcn/ui | Button・Progress・Card・Toast コンポーネント |
| dnd-kit | ドラッグ＆ドロップによる動画リスト並べ替え |
| electron-builder | アプリのビルド・パッケージ化・FFmpegバイナリの同梱 |

### 2.2 ディレクトリ構成

```
video-connector/
├── public/
├── resources/
│   └── ffmpeg/
│       ├── windows/
│       │   ├── ffmpeg.exe
│       │   └── ffprobe.exe
│       └── mac/
│           ├── ffmpeg
│           └── ffprobe
├── src/
│   ├── main/
│   │   ├── index.ts                 # main processのエントリポイント
│   │   ├── ipc/
│   │   │   ├── dialog.ts           # ファイルダイアログの処理
│   │   │   ├── ffmpeg.ts           # FFmpegによる変換・結合・サムネイル生成
│   │   │   ├── metadata.ts         # 動画メタデータの読み取り
│   │   │   └── shell.ts            # 出力先フォルダを開く処理
│   │   └── utils/
│   │       └── platform.ts         # OS判定やFFmpegバイナリのパス解決
│   ├── renderer/
│   │   ├── src/
│   │   │   ├── App.tsx             # アプリルート・画面遷移管理
│   │   │   ├── pages/
│   │   │   │   ├── TitlePage.tsx        # ① タイトル画面
│   │   │   │   ├── VideoListPage.tsx    # ② 動画リスト画面
│   │   │   │   ├── ProgressPage.tsx     # ③ 出力待機画面
│   │   │   │   └── CompletePage.tsx     # ④ 出力完了画面
│   │   │   ├── components/
│   │   │   │   ├── VideoCard.tsx        # 動画リスト項目
│   │   │   │   ├── DraggableList.tsx    # dnd-kitによるリスト
│   │   │   │   └── ProgressBar.tsx      # プログレスバー
│   │   │   ├── hooks/
│   │   │   │   ├── useVideos.ts         # 動画リストの状態管理
│   │   │   │   └── useIpc.ts            # main processとの通信を抽象化
│   │   │   └── styles/
│   │   │       └── global.css
│   │   └── index.html
│   └── preload/
│       └── index.ts                # ipcRendererへのアクセスをsandbox経由で公開
├── electron-builder.ts             # electron-builderの設定
├── electron.config.ts              # electron-viteの設定
├── tsconfig.json
├── package.json
└── README.md
```

---

## 3. 対応動画フォーマット

| カメラ種別 | 典型的なコンテナ | 典型的な動画コーデック | 典型的な音声コーデック |
|---|---|---|---|
| Sony ハンディカム（AVCHD系） | .MTS / .M2TS / .MP4 | H.264 | AAC / AC3 |
| iPhone | .MOV / .MP4 | H.264 / H.265 (HEVC) | AAC |

読み込み時のファイルダイアログでは、以下の拡張子をフィルタとして表示する。

`.mts`, `.m2ts`, `.mov`, `.mp4`

---

## 4. 出力仕様

| 項目 | 値 |
|---|---|
| コンテナ | MP4 |
| 動画コーデック | H.264 (libx264) |
| 音声コーデック | AAC |
| 解像度 | 1920x1080 |
| フレームレート | 60fps |
| ファイル名 | `output_YYYYMMDD_HHmmss.mp4`（日本時間で自動付与）|

---

## 5. 画面構成と遷移

画面遷移のフローは以下の通りである。エラー発生時は直前の画面に戻る。

```
① タイトル画面  →  ② 動画リスト画面  →  ③ 出力待機画面  →  ④ 出力完了画面
```

### 5.1 ① タイトル画面（TitlePage）

アプリ名「Video Connector」と、「動画を追加する」ボタンのみを表示する。

ボタン押下時の挙動：ファイルダイアログが開き、動画ファイルを選択できる。1つ以上の動画が選択されたら、②の動画リスト画面へ遷移する。選択キャンセルの場合は何もしない。

### 5.2 ② 動画リスト画面（VideoListPage）

以下のコンポーネントを表示する。

**動画リスト（DraggableList + VideoCard）**  
dnd-kitによるドラッグ＆ドロップで並べ替えが可能。各リスト項目（VideoCard）には以下を表示する。

| 表示項目 | 取得方法 |
|---|---|
| サムネイル | FFmpegで動画から1フレーム抽出し、非同期で順次生成。生成中はプレースホルダーを表示 |
| 撮影日時 | 動画メタデータから取得。存在しない場合はファイル変更日時にフォールバック |
| ファイル名 | ファイルパスからファイル名を表示 |

**「動画を追加する」ボタン**  
リスト上にも配置し、追加分をリスト末尾に追加する。既に同じファイルが含まれている場合は追加しない（パスで重複チェック）。

**出力先フォルダの設定**  
フォルダ選択ダイアログで任意のフォルダを選択できる。選択済みの場合は選択パスを表示する。

**出力実行ボタン**  
出力先フォルダが未設定の場合は無効（クリック不可）にする。押下時に③の出力待機画面へ遷移し、変換・結合処理を開始する。

### 5.3 ③ 出力待機画面（ProgressPage）

プログレスバー（shadcn/ui の Progress）と、現在の処理状況テキストを表示する。

**テキスト表示のパターン:**

| 段階 | 表示テキスト例 |
|---|---|
| 変換中 | `変換中（3/4）…` |
| 全動画が変換不要で結合のみの場合 | `結合中…` |
| 変換完了後の結合中 | `結合中…` |

**プログレス計算の方法:**  
全体のプログレスは「変換が必要な動画数＋結合1分」で計算する。各動画の変換完了時と、結合完了時にプログレスを更新する。全動画が変換不要の場合は「結合1分」のみとなる。

処理中はバック遷移（前の画面に戻る）を無効にする。

### 5.4 ④ 出力完了画面（CompletePage）

「出力が完了しました！」というメッセージと、出力先を開くボタンを表示する。

開くボタンの挙動は以下の通り、OSで分岐する。

| OS | 動作 |
|---|---|
| Windows | `explorer` コマンドで出力先フォルダを開く |
| macOS | `open` コマンドで出力先フォルダを開く |

---

## 6. FFmpegによる処理設計

### 6.1 処理フロー

出力実行時に以下の順番で処理を行う。

1. 選択された全動画のメタデータを確認する（読み込み時に既に取得済みのメタデータを再利用）。
2. 全動画が出力仕様と同一かどうかを判定する（スキップ判定）。
3. スキップ判定の結果に応じて、変換・結合を実行する。
4. 結合済みの動画を出力先に保存する。

### 6.2 スキップ判定

以下の5項目が**全て一致**していれば、変換処理をスキップし、直接結合のみを行う。1つでも不一致があれば、不一致の動画を変換対象とする。

| 判定項目 | 出力仕様の値 |
|---|---|
| 動画コーデック | H.264 |
| 音声コーデック | AAC |
| コンテナ | MP4 |
| 解像度 | 1920x1080 |
| フレームレート | 60fps |

### 6.3 変換処理

変換が必要な動画には以下のFFmpegオプションを適用する。

| オプション | 目的 |
|---|---|
| `-c:v libx264` | 動画コーデックをH.264に統一 |
| `-c:a aac` | 音声コーデックをAACに統一 |
| `-vf scale=1920:1080` | 解像度を1920x1080に統一 |
| `-r 60` | フレームレートを60fpsに統一 |

変換は並べ順に沿って順次実行し、各動画の変換完了時にプログレスを更新する。変換済みの一時ファイルは結合完了後に削除する。

### 6.4 結合処理

変換済みの動画と変換不要の動画を並べ順に沿って結合する。

結合には`ffmpeg`の`concat`デモuxアプローチを使用し、以下の手順で実行する。

1. 並べ順に動画のパスを記載した`filelist.txt`を生成する。
2. `filelist.txt`を入力として、`-c copy`で再エンコードせずに結合する。

### 6.5 サムネイル生成

動画が追加された直後に非同期で実行し、動画の先頭から1秒目のフレームを抽出してサムネイルとして生成する。生成完了時に`video:thumbnailReady`イベントでrenderer processに通知する。サムネイルはキャッシュディレクトリに保存し、次回起動時に再利用する。

### 6.6 メタデータ読み取り

動画が追加された直後に非同期で実行し、`ffprobe`を使用して以下の情報を取得する。

| メタデータ項目 | FFmpegの取得方法 |
|---|---|
| 動画コーデック | `codec_name`（videoストリーム） |
| 音声コーデック | `codec_name`（audioストリーム） |
| 解像度 | `width` / `height` |
| フレームレート | `r_frame_rate` |
| 撮影日時 | `tags.creation_time`。存在しなければファイル変更日時にフォールバック |

取得完了時に`video:metadataLoaded`イベントでrenderer processに通知する。

---

## 7. プロセス間通信（IPC）設計

### 7.1 renderer → main（呼び出し型）

| イベント名 | 引数 | 処理内容 |
|---|---|---|
| `dialog:selectVideos` | なし | 動画ファイルの選択ダイアログを開く |
| `dialog:selectOutputFolder` | なし | 出力先フォルダの選択ダイアログを開く |
| `ffmpeg:export` | `{ videoPaths: string[], outputDir: string }` | 並べ順と出力先パスを渡し、変換・結合を開始する |
| `shell:openFolder` | `{ folderPath: string }` | 出力先フォルダをエクスプローラー/Finderで開く |

### 7.2 main → renderer（通知型）

| イベント名 | 引数 | 発火タイミング |
|---|---|---|
| `video:metadataLoaded` | `{ filePath: string, metadata: VideoMetadata }` | 動画1本分のメタデータが取得された時 |
| `video:thumbnailReady` | `{ filePath: string, thumbnailPath: string }` | 動画1本分のサムネイルが生成された時 |
| `ffmpeg:progress` | `{ stage: 'converting' \| 'merging', current: number, total: number, percent: number }` | 変換・結合の進行状況が更新された時 |
| `ffmpeg:complete` | `{ outputPath: string }` | 変換・結合が正常に完了した時 |
| `ffmpeg:error` | `{ message: string }` | FFmpegによる処理に失敗した時 |

### 7.3 型定義（参考）

```typescript
interface VideoMetadata {
  videoCodec: string;       // 動画コーデック（例: "h264"）
  audioCodec: string;       // 音声コーデック（例: "aac"）
  width: number;            // 解像度幅
  height: number;           // 解像度高さ
  frameRate: number;        // フレームレート
  creationTime: string | null; // 撮影日時（ISO 8601）。なければnull
  fileModifiedTime: string; // ファイル変更日時（ISO 8601）
}

interface VideoItem {
  id: string;               // リスト項目のユニークID
  filePath: string;         // ファイルパス
  fileName: string;         // ファイル名
  metadata: VideoMetadata | null; // メタデータ（取得中の場合はnull）
  thumbnailPath: string | null;  // サムネイルパス（生成中の場合はnull）
  displayTime: string;      // 表示する撮影日時（creationTime优先、フォールバックはfileModifiedTime）
}
```

---

## 8. エラー対応

### 8.1 エラーダイアログ

エラー発生時は`Electron`のmain processから`dialog.showErrorBox`で通知する。ダイアログを閉じた後は直前の画面に戻る。

### 8.2 エラーの種類と対応

| エラー発生タイミング | エラー種別 | 検出方法 |
|---|---|---|
| 読み込み時 | 対応外の動画フォーマット | FFmpegによるメタデータ読み取りに失敗した場合 |
| 読み込み時 | 動画ファイルの読み取り不可 | ファイルアクセスで例外が発生した場合 |
| 出力時 | 出力先フォルダへの書き込み権限なし | FFmpegの出力時にENOENTやEACCESが発生した場合 |
| 出力時 | ディスク容量不足 | FFmpegの出力時にENOSPCが発生した場合 |
| 出力時 | FFmpegによる変換・結合の失敗 | FFmpegプロセスが非ゼロのexit codeで終了した場合 |

---

## 9. その他の設計事項

### 9.1 一時ファイルの管理

変換済みの一時動画ファイルやサムネイルは、アプリのキャッシュディレクトリに保存する。アプリの標準キャッシュパスは以下の通りで、electron-viteが自動で提供する。

| OS | キャッシュパス |
|---|---|
| Windows | `%APPDATA%\video-connector\Cache` |
| macOS | `~/Library/Caches/video-connector` |

変換済みの一時動画ファイルは結合完了後に削除する。サムネイルは次回起動時にキャッシュとして再利用できるが、アプリ終了時の削除は行わない。

### 9.2 重複チェック

動画リスト画面で「動画を追加する」ボタンで追加する際、既に同じ動画ファイルがリストに含まれている場合は追加しない。判定はファイルの絶対パスで行う。

### 9.3 出力ファイル名の生成

出力ファイル名は以下のフォーマットで自動生成する。タイムゾーンは日本時間（JST/Asia/Tokyo）を固定で使用する。

```
output_YYYYMMDD_HHmmss.mp4
```

例: `output_20260203_153045.mp4`

同一秒に出力が完了した場合の衝突は想定しないが、出力先に同名ファイルが既に存在する場合はサフィックスで連番を付与する（例: `output_20260203_153045_2.mp4`）。
