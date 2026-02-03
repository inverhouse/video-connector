# FFmpeg バイナリ配置場所

このフォルダにFFmpegとFFprobeのバイナリを配置してください。

## Windows用
`windows/` フォルダに以下のファイルを配置:
- `ffmpeg.exe`
- `ffprobe.exe`

## macOS用
`mac/` フォルダに以下のファイルを配置:
- `ffmpeg`
- `ffprobe`

## ダウンロード先

### Windows
- https://www.gyan.dev/ffmpeg/builds/ から「ffmpeg-release-essentials.zip」をダウンロード

### macOS
- https://evermeet.cx/ffmpeg/ からダウンロード
- または Homebrew: `brew install ffmpeg` でインストール後、バイナリをコピー
  - `/opt/homebrew/bin/ffmpeg` (Apple Silicon)
  - `/usr/local/bin/ffmpeg` (Intel)

## 注意事項
- macOS用バイナリには実行権限が必要です
- `chmod +x ffmpeg ffprobe` で実行権限を付与してください
