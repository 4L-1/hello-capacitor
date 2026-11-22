# hello-capacitor

用 [Capacitor](https://capacitorjs.com) 把网页打包成 Android App 的学习示例：一个待办清单，支持热更新和新安装包提示。

## 目录

| 路径 | 作用 |
|---|---|
| `www/` | 普通网页代码（HTML/CSS/JS），App 的全部界面和逻辑 |
| `www/updater.js` | 更新逻辑 |
| `capacitor.config.json` | App 名称、包名、网页目录、插件配置 |
| `android/` | Capacitor 生成的原生壳 |
| `scripts/release.sh` | 一键发布到 GitHub Releases |

## 更新是怎么工作的

每个 GitHub Release 包含三个文件：`update.json`、`web-<版本>.zip`、`hello-capacitor.apk`。

App 每次启动读取 `releases/latest/download/update.json`：

1. `apkVersionCode` 比已安装的大：提示下载新 `.apk`（改了原生代码、加插件时）。
2. 否则 `version` 比当前网页版本新：用 [@capgo/capacitor-updater](https://github.com/Cap-go/capacitor-updater) 下载网页压缩包热更新，不用重装。新版本如果没能调用 `notifyAppReady()`，会自动回滚。

## 开发

需要 Node 20+、JDK 21、Android SDK。

```bash
npm install
npx cap sync android
cd android && ./gradlew assembleDebug   # 调试包
```

## 发布

```bash
NOTES="修复了某某问题" scripts/release.sh 1.2.0         # 只改了 www/：热更新
NOTES="新增相机功能"   scripts/release.sh 1.3.0 --apk   # 改了原生部分：用户需装新 .apk
```

发布需要签名文件 `~/.android-keys/keystore.properties`（不进 git）。**签名文件丢了就无法覆盖安装旧版**，务必备份。
