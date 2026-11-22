// 更新逻辑：每次启动去 GitHub Releases 读 update.json，决定怎么更新
//  - 只改了网页（www）：热更新，下载网页压缩包替换，不用重装
//  - 改了原生部分（换插件、改权限等）：提示下载新 .apk 安装

// 当前网页版本号，由 scripts/release.sh 自动修改，不要手改
const WEB_VERSION = '1.4.0';
const UPDATE_URL = 'https://github.com/4L-1/hello-capacitor/releases/latest/download/update.json';

// 比较版本号：a 比 b 新返回 true，比如 isNewer('1.2.0', '1.1.9') === true
function isNewer(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

async function checkForUpdate(manual) {
  const Cap = window.Capacitor;
  if (!Cap || !Cap.isNativePlatform()) return;
  const { CapacitorUpdater, CapacitorHttp, App, Browser } = Cap.Plugins;
  const status = (msg) => { document.getElementById('update-status').textContent = msg; };

  // 1. 读取远程 update.json（用原生 HTTP，绕开浏览器的跨域限制）
  let info;
  try {
    status('正在检查更新…');
    // 加时间戳参数并禁用缓存，避免拿到旧的 update.json
    const res = await CapacitorHttp.get({
      url: UPDATE_URL + '?t=' + Date.now(),
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.status !== 200) throw new Error('HTTP ' + res.status);
    info = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  } catch (e) {
    status(manual ? '检查更新失败：' + e.message : '');
    return;
  }

  // 2. 原生版本更旧：必须装新 .apk（App.getInfo().build 就是 versionCode）
  const app = await App.getInfo();
  if (info.apkVersionCode > Number(app.build)) {
    status('有新安装包 ' + info.version);
    if (confirm('发现新版本 ' + info.version + '，需要下载新安装包。\n\n' + (info.notes || '') + '\n\n现在下载吗？')) {
      await Browser.open({ url: info.apkUrl });
    }
    return;
  }

  // 3. 只是网页更旧：热更新
  if (isNewer(info.version, WEB_VERSION)) {
    status('正在下载更新 ' + info.version + '…');
    let bundle;
    try {
      // checksum 是压缩包的 SHA-256，插件下载后会校验，防止文件损坏或被篡改
      bundle = await CapacitorUpdater.download({ url: info.webZipUrl, version: info.version, checksum: info.webZipSha256 });
    } catch (e) {
      status('更新下载失败：' + (e.message || e));
      return;
    }
    if (confirm('新版本 ' + info.version + ' 已下载。\n\n' + (info.notes || '') + '\n\n现在重启应用吗？')) {
      await CapacitorUpdater.set(bundle);   // 立即切换并刷新
    } else {
      await CapacitorUpdater.next(bundle);  // 下次启动时再切换
      status('新版本将在下次打开时生效');
    }
    return;
  }

  status(manual ? '已是最新版本' : '');
}

document.getElementById('version').textContent = '版本 ' + WEB_VERSION;
document.getElementById('check-update').onclick = () => checkForUpdate(true);

if (window.Capacitor && window.Capacitor.isNativePlatform()) {
  // 告诉更新插件：这个网页版本能正常运行。不调用的话插件会认为更新失败，自动回滚
  window.Capacitor.Plugins.CapacitorUpdater.notifyAppReady();
  checkForUpdate(false);
}
