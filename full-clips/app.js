'use strict';

const {config, form} = window.FAVE_STUDY;
const $ = id => document.getElementById(id);
const preview = ['1', 'id'].includes(new URLSearchParams(location.search).get('preview'));
const prefix = 'fave-four-full-v1:' + (preview ? 'preview:' : 'study:');
const activeKey = prefix + 'active';
const collector = 'https://fave-motion-results.helpfulchick2.chatgpt.site/api/full-clips/responses';
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

function shuffled(items) {
  const result = items.slice();
  const random = new Uint32Array(result.length);
  crypto.getRandomValues(random);
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random[index] / 2 ** 32 * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function assignSides(trials) {
  const order = shuffled(trials);
  return Object.fromEntries(order.map((trial,i)=>[trial.item_id,i < order.length / 2]));
}

function showTrio(trial) {
  const clip = window.FULL_CLIPS[trial.item_id];
  const video = node('video', 'trio-clock');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('x5-playsinline', '');
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
    percent = Math.max(percent,value);
    watched[trial.item_id] = percent;
    for (const {ring,ended,duration} of rings) {
      ended.hidden = !(duration < video.duration && video.currentTime >= duration);
      const played = Math.min(100,Math.floor(percent * video.duration / duration));
      ring.textContent = played + '%';
      ring.style.setProperty('--watched', ring.textContent);
      ring.setAttribute('aria-valuenow', played);
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
    canvas.width = 512;
    canvas.height = 512;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
    displays.push({context: canvas.getContext('2d'), column});
    const ring = node('span', 'watch-badge', percent + '%');
    ring.setAttribute('role', 'progressbar');
    ring.setAttribute('aria-label', label + '的观看进度');
    ring.setAttribute('aria-valuenow', percent);
    ring.style.setProperty('--watched', ring.textContent);
    const ended = node('span','clip-ended','已播完');
    ended.hidden = true;
    rings.push({ring,ended,duration:clip.durations[column]});
    frame.append(canvas,ring,ended);
    if (!side) canvas.id = 'reference-picture';
    frame.addEventListener('click', toggleAll);
    item.append(caption, frame);
    return item;
  }
  const row = node('div', 'trio-row');
  const swap = session.sides[trial.item_id];
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
      context.drawImage(video, column * 512, 0, 512, 512, 0, 0, 512, 512);
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
  video.addEventListener('loadeddata', () => { paint(); updateRings(percent); });
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
  video.src = clip.src;
  nextFrame();
  playAll();
}

function updateProgressText(position, total) {
  const bar = $('progress');
  bar.max = total;
  bar.value = position;
  const progress = '第 ' + position + ' 题，共 ' + total + ' 题（原第 ' + form.trials[position-1].order_index + ' 题）';
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
  storedLocally = write(prefix + session.id, session) && write(activeKey, session.id);
  updateStatus();
}
function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b=>b.toString(16).padStart(2,'0')).join('');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}
function start() {
  disposeTrio?.();
  session = read(prefix + read(activeKey));
  session ??= {
    id: newId(), secret: newId(), sides: assignSides(form.trials),
    index: 0, rows: {}, revision: 0, ack: 0, complete: false,
  };
  save();
  render();
  sync();
}

function updateStatus() {
  const count = Object.keys(session.rows).length;
  if (session.complete) {
    updateExport();
    let message;
    if (preview) message = '预览模式，可下载 CSV 查看答案';
    else if (session.ack === session.revision) message = '全部答案已在线保存成功';
    else if (!navigator.onLine) message = '当前未联网，请下载 CSV 备份答案';
    else if (syncFailed) message = '未收到服务器的保存确认，请下载 CSV 备份答案';
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

async function sendAnswers(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(collector, {method:'POST', credentials:'omit', signal:controller.signal,
      headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if (!response.ok) throw Error('Submission failed');
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function sync() {
  if (syncing || preview || !navigator.onLine) { updateStatus(); return; }
  syncing = true;
  try {
    const pending = new Set([session.id]);
    // A second participant can start on this device while the first is offline.
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix) && key !== activeKey) pending.add(key.slice(prefix.length));
      }
    } catch { /* The active session can still sync from memory. */ }
    for (const id of pending) {
      const record = id === session.id ? session : read(prefix + id);
      if (!record || record.revision <= record.ack) continue;
      const revision = record.revision;
      const answers = Object.values(record.rows).map(row => ({
        item:row.item_id, choice:row.choice_raw, left:row.left_setting, rt:row.rt_ms, at:row.submitted_at
      }));
      const saved = await sendAnswers({version:config.version,id,secret:record.secret,revision,answers,complete:record.complete});
      if (saved.id !== id || saved.revision !== revision) throw Error('Missing receipt');
      const latest = session.id === id ? session : read(prefix + id);
      if (latest) {
        if (saved.downloadToken && /^[a-f0-9]{64}$/.test(saved.downloadToken)) latest.downloadToken = saved.downloadToken;
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
  const swap = session.sides[trial.item_id];
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
    $('download-csv').focus({preventScroll:true});
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
let localFile;
function updateExport() {
  const link = $('download-csv');
  if (!localFile) {
    const rows = form.trials.map(t=>session.rows[t.item_id]);
    const text = window.AnswerFile.csv(rows);
    $('csv-text').value = text;
    $('csv-url').value = window.AnswerFile.portableLink(session.id,rows);
    $('link-backup').hidden = false;
    localFile = window.AnswerFile.fileUrl(text);
    $('export-help').open = /MicroMessenger/i.test(navigator.userAgent);
  }
  const remote = session.downloadToken && session.ack === session.revision ?
    collector.replace(/responses$/,'csv/') + session.id + '/' + session.downloadToken + '.csv' : '';
  if (remote && navigator.onLine) {
    link.href = remote;
    link.removeAttribute('download');
  } else {
    link.href = localFile;
    link.download = 'FAVE-four-v1-' + session.id + '.csv';
  }
}
async function copyField(id) {
  const field = $(id);
  field.focus();
  field.select();
  field.setSelectionRange(0,field.value.length);
  let copied = false;
  try {
    await navigator.clipboard.writeText(field.value);
    copied = true;
  } catch {
    try { copied = document.execCommand('copy'); } catch { /* Manual selection stays available. */ }
  }
  $('copy-status').textContent = copied ? '已复制' : '请长按选中的内容，选择“复制”';
}
$('copy-url').onclick = () => copyField('csv-url');
$('copy-csv').onclick = () => copyField('csv-text');
$('previous').onclick = () => navigate(-1);
$('continue').onclick = () => navigate(1);
$('download-csv').onclick = () => {
  $('export-help').open = true;
  showFireworks();
};
window.addEventListener('online',sync);
window.addEventListener('offline',updateStatus);
window.addEventListener('storage',event => {
  if (event.key !== prefix + session.id || !event.newValue) return;
  const latest = JSON.parse(event.newValue);
  if (latest.revision < session.revision) return;
  const redraw = latest.revision !== session.revision || latest.index !== session.index;
  session = latest;
  if (redraw) render(); else updateStatus();
});
setInterval(sync,15000);
start();
