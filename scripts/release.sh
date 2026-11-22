#!/usr/bin/env bash
# 发布新版本到 GitHub Releases
# 用法：
#   scripts/release.sh 1.2.0          只改了网页：用户端热更新
#   scripts/release.sh 1.2.0 --apk    改了原生部分：versionCode +1，用户端提示下载新 .apk
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${1:?用法: scripts/release.sh <版本号> [--apk]}"
NATIVE="${2:-}"
REPO="${REPO:-4L-1/hello-capacitor}"
GRADLE=android/app/build.gradle
BASE="https://github.com/$REPO/releases/download/v$VERSION"

# 1. 改网页版本号
sed -i "s/^const WEB_VERSION = '.*';/const WEB_VERSION = '$VERSION';/" www/updater.js

# 2. 原生更新时 versionCode +1
CODE=$(grep -oP 'versionCode \K\d+' "$GRADLE")
if [ "$NATIVE" = "--apk" ]; then CODE=$((CODE + 1)); fi
sed -i "s/versionCode [0-9]*/versionCode $CODE/; s/versionName \".*\"/versionName \"$VERSION\"/" "$GRADLE"

# 3. 打包：网页压缩包（index.html 在压缩包根目录）+ 签名的 .apk
OUT=release-out; rm -rf "$OUT"; mkdir -p "$OUT"
(cd www && zip -qr "../$OUT/web-$VERSION.zip" . -x '.*')
npx cap sync android
(cd android && ./gradlew assembleRelease -q)
cp android/app/build/outputs/apk/release/app-release.apk "$OUT/hello-capacitor.apk"

# 4. update.json：App 启动时读取它决定怎么更新
NOTES="${NOTES:-版本 $VERSION}"
cat > "$OUT/update.json" <<JSON
{
  "version": "$VERSION",
  "webZipUrl": "$BASE/web-$VERSION.zip",
  "webZipSha256": "$(sha256sum "$OUT/web-$VERSION.zip" | cut -d' ' -f1)",
  "apkVersionCode": $CODE,
  "apkUrl": "$BASE/hello-capacitor.apk",
  "notes": "$NOTES"
}
JSON

# 5. 提交并发布
git add -A
git commit -qm "release v$VERSION"
git push -q origin HEAD
gh release create "v$VERSION" "$OUT"/* --repo "$REPO" --title "v$VERSION" --notes "$NOTES"
echo "已发布 v$VERSION（versionCode $CODE）"
