'use strict';

async function openAnswerLink() {
  const status = document.getElementById('export-status');
  const button = document.getElementById('save-file');
  const hash = location.hash;
  button.hidden = true;
  try {
    const {file, count} = await readAnswerLink(hash);
    if (hash !== location.hash) return;
    if (/MicroMessenger/i.test(navigator.userAgent)) {
      status.textContent = '请将完整的下载链接粘贴到手机浏览器，再下载答卷';
      return;
    }
    status.textContent = '已读取全部 ' + count + ' 题答案';
    button.onclick = () => downloadAnswerFile(file);
    button.hidden = false;
  } catch {
    if (hash === location.hash) status.textContent = '无法读取答卷。请回微信重新复制完整下载链接，或选择「复制答卷内容」';
  }
}
window.addEventListener('hashchange', openAnswerLink);
openAnswerLink();
