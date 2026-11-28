'use strict';

const {config, form} = window.FAVE_STUDY;
const $ = id => document.getElementById(id);
const preview = ['1', 'id'].includes(new URLSearchParams(location.search).get('preview'));
const mode = preview ? 'preview:' : 'study:';
const prefix = 'fave53-v28:' + mode;
const unsaved = new Map();
// Rotate only the active pointer. Older sheets keep their export and upload records.
const activeKey = 'fave53-current:v28.1:' + mode;
const previousActiveKey = prefix + 'active';
const collector = 'https://fave-motion-results.helpfulchick2.chatgpt.site/api/v28/responses';
const inWeChat = /MicroMessenger/i.test(navigator.userAgent);
let session;
let disposeTrio;
let openedAt;
let storedLocally = true;
let syncing = false;
let syncFailed = false;

function node(tag, classes = '', text = '') {
  const element = document.createElement(tag);
  if (classes) element.className = classes;
  if (text) element.textContent = text;
  return element;
}

function showTrio(trial) {
  const video = node('video', 'trio-clock');
  video.playsInline = true;
  video.muted = true;
  video.defaultMuted = true;
  video.preload = 'auto';
  video.setAttribute('aria-hidden', 'true');

  const candidatePanel = $('candidates');
  candidatePanel.replaceChildren();
  candidatePanel.setAttribute('aria-label', '参考视频和候选视频');
  const title = node('header', 'section-title');
  title.append(node('h2', '', '请观察头部、眉毛和嘴巴的动作'));
  candidatePanel.append(title);
  const control = node('button', 'play-button play-both', '全部播放');
  control.type = 'button';
  title.append(control);
  const displays = [];
  const rings = [];
  const watched = session.watched ??= {};
  let percent = watched[trial.item_id] ?? 0;
  function updateRings(value) {
    if (value <= percent) return;
    percent = value;
    watched[trial.item_id] = value;
    for (const ring of rings) {
      ring.textContent = value + '%';
      ring.style.setProperty('--watched', ring.textContent);
      ring.setAttribute('aria-valuenow', value);
    }
  }
  function card(label, column, side) {
    const item = node('article', 'video-card');
    const caption = node('div', 'video-label', label);
    if (side) {
      caption.classList.add('candidate-label');
      caption.replaceChildren('候选视频 ', node('span', 'candidate-key', side));
    }
    const frame = node('div', 'media-frame trio-frame');
    const canvas = node('canvas');
    canvas.width = 196;
    canvas.height = 260;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
    displays.push({context: canvas.getContext('2d'), column});
    const ring = node('span', 'watch-badge', percent + '%');
    ring.setAttribute('role', 'progressbar');
    ring.setAttribute('aria-label', label + '的观看进度');
    ring.setAttribute('aria-valuenow', percent);
    ring.style.setProperty('--watched', ring.textContent);
    rings.push(ring);
    frame.append(canvas, ring);
    if (!side) canvas.id = 'reference-picture';
    frame.addEventListener('click', toggleAll);
    item.append(caption, frame);
    return item;
  }
  const row = node('div', 'trio-row');
  const swap = trial.order_index % 2 === 0;
  row.append(
    card('候选视频 A', swap ? 2 : 1, 'A'),
    card('GT 参考视频', 0),
    card('候选视频 B', swap ? 1 : 2, 'B')
  );
  candidatePanel.append(row, video);

  let live = true;
  let frameRequest;
  const nativeFrames = typeof video.requestVideoFrameCallback === 'function';
  function paint() {
    if (!live || video.readyState < 2) return;
    for (const {context, column} of displays) {
      context.drawImage(video, column * 196, 0, 196, 260, 0, 0, 196, 260);
    }
  }
  function nextFrame() {
    if (!live) return;
    paint();
    frameRequest = nativeFrames ? video.requestVideoFrameCallback(nextFrame) : requestAnimationFrame(nextFrame);
  }
  function setButton() {
    control.textContent = video.paused ? '全部播放' : '全部暂停';
    control.dataset.state = video.paused ? 'play' : 'pause';
  }
  function playAll() {
    video.play().catch(error => {
      if (live && error.name !== 'AbortError') setButton();
    });
  }
  function toggleAll() {
    if (video.paused) playAll();
    else video.pause();
  }
  control.addEventListener('click', toggleAll);
  video.addEventListener('loadeddata', paint);
  video.addEventListener('seeked', paint);
  video.addEventListener('play', setButton);
  video.addEventListener('pause', setButton);
  video.addEventListener('timeupdate', () => {
    if (live && Number.isFinite(video.duration) && video.duration > 0) {
      updateRings(Math.floor(100 * video.currentTime / video.duration));
    }
  });
  video.addEventListener('ended', () => {
    if (!live) return;
    updateRings(100);
    video.currentTime = 0;
    playAll();
  });
  video.addEventListener('error', () => {
    if (live) $('feedback').textContent = '视频加载失败，请检查网络后刷新页面';
  });
  disposeTrio = () => {
    live = false;
    if (nativeFrames) video.cancelVideoFrameCallback(frameRequest);
    else cancelAnimationFrame(frameRequest);
    video.pause();
    video.removeAttribute('src');
    video.load();
    disposeTrio = null;
  };
  video.src = window.FAVE_TRIOS[trial.item_id];
  nextFrame();
  playAll();
}

function updateProgressText(position, total) {
  const bar = $('progress');
  bar.max = total;
  bar.value = position;
  const progress = '第 ' + position + ' 题，共 ' + total + ' 题';
  $('progress-count').textContent = progress;
  bar.setAttribute('aria-valuetext', progress);
}

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
function save() {
  storedLocally = write(prefix + session.id, session);
  if (storedLocally) unsaved.delete(session.id);
  else unsaved.set(session.id, session);
  updateStatus();
}
function start(newSheet = false) {
  disposeTrio?.();
  session = (!newSheet && read(prefix + read(activeKey))) || {
    id: crypto.randomUUID(), secret: crypto.randomUUID(),
    index: 0, rows: {}, revision: 0, ack: 0, complete: false,
  };
  save();
  storedLocally = write(activeKey, session.id) && storedLocally;
  $('backup-status').textContent = '';
  $('manual-copy').hidden = true;
  $('manual-copy').value = '';
  $('history-status').textContent = '';
  $('history-copy').hidden = true;
  $('history-copy').value = '';
  $('history').open = false;
  updateHistory();
  render();
  sync();
}

function updateStatus() {
  const count = Object.keys(session.rows).length;
  if (session.complete) {
    let message;
    if (preview) message = '预览模式，可导出答卷查看答案';
    else if (session.ack === session.revision) message = '全部答案已在线保存成功';
    else if (!navigator.onLine) message = '当前未联网，请备份答卷';
    else if (syncFailed) message = '未收到服务器的保存确认，请备份答卷';
    else message = '正在将答案保存到服务器…';
    const status = $('finish-status');
    if (status.textContent !== message) status.textContent = message;
    return;
  }
  let message;
  if (preview) message = '预览模式：答案仅保存在此浏览器中';
  else if (!count) message = '联网后会自动保存你的匿名答案';
  else if (session.ack === session.revision) message = '已在线保存 ' + count + ' 题，共 ' + form.total_trials + ' 题';
  else if (!navigator.onLine || syncFailed) message = '正在等待网络连接，连上后会自动保存答案';
  else message = '正在保存答案…';
  if (!storedLocally) message += ' 当前浏览器无法保存进度，请在完成前保持此页面打开';
  $('sync-status').textContent = message;
}

async function sync() {
  if (syncing || preview || !navigator.onLine) { updateStatus(); return; }
  syncing = true;
  try {
    const pending = new Set([session.id, ...unsaved.keys()]);
    // A second participant can start on this device while the first is offline.
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix) && key !== previousActiveKey) pending.add(key.slice(prefix.length));
      }
    } catch { /* The active session can still sync from memory. */ }
    for (const id of pending) {
      const record = id === session.id ? session : unsaved.get(id) || read(prefix + id);
      if (!record || record.revision <= record.ack) continue;
      const revision = record.revision;
      const answers = Object.values(record.rows).map(row => ({
        item:row.item_id, choice:row.choice_raw, left:row.left_setting, rt:row.rt_ms, at:row.submitted_at
      }));
      const response = await fetch(collector, {method:'POST', credentials:'omit',
        headers:{'Content-Type':'application/json'}, signal:AbortSignal.timeout(12000),
        body:JSON.stringify({version:config.version, id, secret:record.secret, revision, answers, complete:record.complete})});
      if (!response.ok) throw Error('Submission failed');
      const saved = await response.json();
      if (saved.id !== id || saved.revision !== revision) throw Error('Missing receipt');
      const latest = session.id === id ? session : unsaved.get(id) || read(prefix + id);
      if (latest) {
        latest.ack = Math.max(latest.ack, revision);
        if (latest === session) save(); else write(prefix + id, latest);
      }
      syncFailed = false;
    }
  } catch { syncFailed = true; }
  finally { syncing = false; updateStatus(); }
  if (!syncFailed && session.ack < session.revision && navigator.onLine) void sync();
}

function choose(trial, choice) {
  const swap = trial.order_index % 2 === 0;
  const left = swap ? trial.test_setting : trial.base_setting;
  const right = swap ? trial.base_setting : trial.test_setting;
  const now = Date.now();
  const old = session.rows[trial.item_id];
  session.rows[trial.item_id] = {study_version:config.version, participant_id:session.id, form_id:form.form_id,
    order_index:trial.order_index, item_id:trial.item_id, round:trial.round, task:trial.task,
    character:trial.character, scene_id:trial.scene_id, audio_comparison:trial.audio_comparison,
    lora_weights:trial.lora_weights, left_setting:left, right_setting:right, choice_raw:choice,
    picked_setting:choice === 'A' ? left : right, rt_ms:(old?.rt_ms || 0) + Math.max(0,now-openedAt),
    submitted_at:new Date(now).toISOString()};
  openedAt = now;
  session.revision++;
  $('continue').disabled = false;
  save();
  void sync();
}

let fireworksTimer;
function showFireworks() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = $('fireworks');
  const sparks = document.createDocumentFragment();
  const colors = ['#b54e48', '#cc9344', '#629986', '#6487ad'];
  for (const [burst, [x, y]] of [[24, 32], [76, 36], [51, 22]].entries()) {
    for (let i = 0; i < 32; i++) {
      const angle = 2 * Math.PI * i / 32 + burst;
      const radius = (i % 2 ? 50 : 82) * Math.min(1, layer.clientWidth / 580);
      const spark = node('i', 'spark');
      spark.style.setProperty('--x', x + '%');
      spark.style.setProperty('--y', y + '%');
      spark.style.setProperty('--delay', burst * 250 + 'ms');
      spark.style.setProperty('--angle', angle + 'rad');
      spark.style.setProperty('--color', colors[(i + burst) % colors.length]);
      spark.style.setProperty('--dx', Math.cos(angle) * radius + 'px');
      spark.style.setProperty('--dy', Math.sin(angle) * radius + 12 + 'px');
      sparks.append(spark);
    }
  }
  clearTimeout(fireworksTimer);
  layer.replaceChildren(sparks);
  fireworksTimer = setTimeout(() => layer.replaceChildren(), 1750);
}

function render() {
  disposeTrio?.();
  $('study-header').hidden = session.complete;
  $('save-status').hidden = session.complete;
  $('progress-display').hidden = session.complete;
  $('trial-screen').hidden = session.complete;
  const enteringFinish = session.complete && $('finish-screen').hidden;
  $('finish-screen').hidden = !session.complete;
  updateProgressText(session.index+1,form.total_trials);
  if (session.complete) {
    if (inWeChat) prepareWeChatExport();
    $(inWeChat ? 'copy-link' : 'download-csv').focus({preventScroll:true});
    if (enteringFinish) showFireworks();
  } else {
    const trial = form.trials[session.index];
    openedAt = Date.now();
    $('feedback').textContent = '';
    showTrio(trial);
    const question = config.questions.PartA_Pairwise.choice;
    const field = node('fieldset','answer-group');
    field.append(node('legend','',question.label_zh));
    const choices = node('div','options');
    for (const {value, label_zh} of question.options) {
      const option = node('label','option');
      const input = node('input');
      input.type = 'radio';
      input.name = 'choice_raw';
      input.value = value;
      input.checked = session.rows[trial.item_id]?.choice_raw === value;
      input.addEventListener('change', () => choose(trial,value));
      option.append(input,node('span','',label_zh));
      if (value === 'B') choices.append($('continue'));
      choices.append(option);
    }
    field.append(choices);
    $('answers').replaceChildren(field);
    $('previous').disabled = session.index === 0;
    $('continue').disabled = !session.rows[trial.item_id];
    $('continue').textContent = session.index === form.total_trials-1 ? '完成' : '下一题';
  }
  updateStatus();
  window.scrollTo(0,0);
}
function navigate(direction) {
  if (direction > 0 && !session.rows[form.trials[session.index].item_id]) return;
  if (session.index + direction === form.total_trials) {
    session.complete = true;
    session.revision++;
  } else session.index += direction;
  save();
  render();
  void sync();
}
function completedRows(record = session) {
  if (!record.complete || Object.keys(record.rows).length !== form.total_trials) return null;
  return Object.values(record.rows).sort((a,b) => a.order_index-b.order_index)
    .map(row => csvFields.map(key => row[key] ?? null));
}

function answerFilename(record = session) {
  return 'FAVE-' + config.version + '-' + (preview ? 'preview-' : '') + record.id + '.csv';
}

function downloadCsv() {
  const rows = completedRows();
  if (!rows) return;
  downloadAnswerFile(answerFile(answerFilename(), rows));
  showFireworks();
}

async function copyBackup(value, label, success, field = $('manual-copy'), status = $('backup-status')) {
  field.hidden = true;
  try {
    await navigator.clipboard.writeText(value);
    status.textContent = success;
  } catch {
    field.value = value;
    field.setAttribute('aria-label', label);
    field.hidden = false;
    field.focus();
    field.select();
    status.textContent = '请长按下方文字，选择「全选」并复制' + label;
  }
}

function prepareDownloadLink(name, rows) {
  const bytes = new TextEncoder().encode(JSON.stringify({name, rows}));
  let link = answerLink(bytes, 'raw');
  if (typeof CompressionStream === 'function' && typeof DecompressionStream === 'function') {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    new Response(stream).arrayBuffer().then(buffer => {
      link = answerLink(new Uint8Array(buffer), 'gz');
    }).catch(() => { /* The uncompressed link is already available. */ });
  }
  return () => link;
}

function prepareWeChatExport() {
  const rows = completedRows();
  if (!rows) return;
  const name = answerFilename();
  const getLink = prepareDownloadLink(name, rows);
  $('download-csv').hidden = true;
  $('wechat-export').hidden = false;
  $('copy-link').onclick = () => copyBackup(getLink(), '下载链接', '链接已复制，请粘贴到手机浏览器的地址栏');
  $('copy-answers').onclick = () => copyBackup(answerCsv(rows), '答卷内容', '全部答案已复制，可粘贴到微信聊天中备份');
  if (typeof navigator.canShare === 'function' && typeof navigator.share === 'function') {
    const data = {files:[answerFile(name, rows)]};
    if (navigator.canShare(data)) {
      $('share-file').hidden = false;
      $('share-file').onclick = async () => {
        try { await navigator.share(data); }
        catch (error) {
          if (error.name !== 'AbortError') $('backup-status').textContent = '请复制下载链接，或复制答卷内容';
        }
      };
    }
  }
}
function updateHistory() {
  const saved = new Map(unsaved);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(prefix) && key !== previousActiveKey && !saved.has(key.slice(prefix.length))) {
        const record = read(key);
        if (record) saved.set(record.id, record);
      }
    }
  } catch { /* Records held in memory are still available on this page. */ }
  const list = $('history-list');
  list.replaceChildren();
  for (const record of saved.values()) {
    if (!record.complete || record.id === session.id) continue;
    const rows = completedRows(record);
    if (!rows) continue;
    const name = answerFilename(record);
    const last = rows[rows.length - 1][csvFields.indexOf('submitted_at')];
    const item = node('li');
    const button = node('button', 'button', new Date(last).toLocaleString('zh-CN') +
      ' · ' + record.id.slice(0,8) + (inWeChat ? ' 复制下载链接' : ' 下载 CSV'));
    button.type = 'button';
    if (inWeChat) {
      const getLink = prepareDownloadLink(name, rows);
      button.onclick = () => copyBackup(getLink(), '下载链接', '链接已复制，请粘贴到手机浏览器的地址栏',
        $('history-copy'), $('history-status'));
    } else button.onclick = () => downloadAnswerFile(answerFile(name, rows));
    item.append(button);
    list.append(item);
  }
  const legacy = read('fave53-v21:' + mode + 'active');
  if (legacy) {
    const link = node('a', '', '打开旧版 30 题问卷');
    link.href = 'v27/' + (preview ? '?preview=1' : '');
    const item = node('li');
    item.append(link);
    list.append(item);
  }
  $('history').hidden = !list.childElementCount;
}

$('repeat').onclick = () => {
  if (session.complete) start(true);
};
$('previous').onclick = () => navigate(-1);
$('continue').onclick = () => navigate(1);
$('download-csv').onclick = downloadCsv;
window.addEventListener('online',sync);
window.addEventListener('offline',updateStatus);
window.addEventListener('storage',event => {
  if (event.key === activeKey && event.newValue && read(activeKey) !== session.id) {
    start();
    return;
  }
  if (event.key !== prefix + session.id || !event.newValue) return;
  const latest = JSON.parse(event.newValue);
  if (latest.revision < session.revision) return;
  const redraw = latest.revision !== session.revision || latest.index !== session.index;
  session = latest;
  if (redraw) render(); else updateStatus();
});
setInterval(sync,15000);
start();
