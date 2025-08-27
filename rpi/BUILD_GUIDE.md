# Download releases from:
https://github.com/BtbN/FFmpeg-Builds/releases

ffmpeg-n7.1-latest-linux64-lgpl-7.1.tar.xz
ffmpeg-n7.1-latest-linuxarm64-lgpl-7.1.tar.xz
ffmpeg-n7.1-latest-win64-lgpl-7.1.zip
ffmpeg-n7.1-latest-winarm64-lgpl-7.1.zip

# Build go program
```cmd
set GOOS=linux
set GOARCH=amd64
go build -o rpi_linux_amd64 .

set GOOS=linux
set GOARCH=arm64
go build -o rpi_linux_arm64 .

set GOOS=windows
set GOARCH=amd64
go build -o rpi_windows_amd64.exe .

set GOOS=windows
set GOARCH=arm64
go build -o rpi_windows_arm64.exe .
```
