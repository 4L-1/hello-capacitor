// 这是普通网页 JS。Capacitor 把 www 目录打包进 App，用系统 WebView 运行。

// Capacitor 在 App 里会注入 window.Capacitor；在电脑浏览器里打开时没有
const Cap = window.Capacitor;
const isNative = Cap && Cap.isNativePlatform();
document.getElementById('env').textContent =
  isNative ? '运行在：Android App（' + Cap.getPlatform() + '）' : '运行在：浏览器';

// 原生插件：震动反馈。只有在 App 里才能调用
function vibrate() {
  if (isNative) Cap.Plugins.Haptics.impact({ style: 'MEDIUM' });
}

// 数据存在 localStorage，App 关掉再打开也还在
const KEY = 'todos';
let todos = JSON.parse(localStorage.getItem(KEY) || '[]');
const save = () => localStorage.setItem(KEY, JSON.stringify(todos));

const list = document.getElementById('list');
function render() {
  list.innerHTML = '';
  todos.forEach((t, i) => {
    const li = document.createElement('li');
    if (t.done) li.className = 'done';
    li.innerHTML = '<input type="checkbox"' + (t.done ? ' checked' : '') + '><span></span><button class="del">删除</button>';
    li.querySelector('span').textContent = t.text;
    li.querySelector('input').onchange = () => { t.done = !t.done; vibrate(); save(); render(); };
    li.querySelector('.del').onclick = () => { todos.splice(i, 1); vibrate(); save(); render(); };
    list.appendChild(li);
  });
}

document.getElementById('form').onsubmit = (e) => {
  e.preventDefault();
  const input = document.getElementById('input');
  const text = input.value.trim();
  if (!text) return;
  todos.push({ text, done: false });
  input.value = '';
  vibrate();
  save();
  render();
};

render();
