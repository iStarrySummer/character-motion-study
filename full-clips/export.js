'use strict';
try {
  const {id,text} = window.AnswerFile.readLink(location.hash.slice(1));
  const file=document.getElementById('file');
  file.href=window.AnswerFile.fileUrl(text);
  file.download='FAVE-four-v1-'+id+'.csv';
  file.hidden=false;
  document.getElementById('message').textContent=/MicroMessenger/i.test(navigator.userAgent)
    ? '请点击微信右上角的“…”并选择在浏览器中打开，再下载这 4 题的答案。' : '4 题答案已就绪';
} catch {
  document.getElementById('message').textContent='答卷链接不完整，请从完成页重新复制完整链接。';
}
