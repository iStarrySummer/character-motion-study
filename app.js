'use strict';

const {config, form} = window.FAVE_STUDY;
const $ = id => document.getElementById(id);
const preview = ['1', 'id'].includes(new URLSearchParams(location.search).get('preview'));
// Keep v21 sessions and their queued uploads across this layout update.
const prefix = 'fave53-v21:' + (preview ? 'preview:' : 'study:');
const activeKey = prefix + 'active';
const collector = 'https://fave-motion-results.helpfulchick2.chatgpt.site/api/responses';
const csvFields = ['study_version','participant_id','form_id','order_index','item_id','round','task',
  'character','scene_id','audio_comparison','lora_weights','left_setting','right_setting',
  'choice_raw','picked_setting','rt_ms','submitted_at'];
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
  const result = {};
  for (const task of ['audio', 'lora']) {
    const items = shuffled(trials.filter(trial => trial.task === task));
    const oneSide = items.length % 2 ? shuffled([false, true])[0] : false;
    const testOnLeft = Math.floor(items.length / 2) + Number(oneSide);
    items.forEach((trial, index) => { result[trial.item_id] = index < testOnLeft; });
  }
  return result;
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
  candidatePanel.setAttribute('aria-label', 'Reference and candidate videos');
  const title = node('header', 'section-title');
  title.append(node('h2', '', 'Watch the head, eyebrows, and mouth'));
  candidatePanel.append(title);
  const control = node('button', 'play-button play-both', 'Play all');
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
      caption.replaceChildren('Candidate ', node('span', 'candidate-key', side));
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
    ring.setAttribute('aria-label', label + ' watched');
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
  const swap = session.sides[trial.item_id];
  row.append(
    card('Candidate A', swap ? 2 : 1, 'A'),
    card('GT reference', 0),
    card('Candidate B', swap ? 1 : 2, 'B')
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
    control.textContent = video.paused ? 'Play all' : 'Pause all';
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
    if (live) $('feedback').textContent = 'The comparison video could not be loaded';
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
  $('progress-count').textContent = 'Question ' + position + ' / ' + total;
  bar.setAttribute('aria-valuetext', 'Question ' + position + ' of ' + total);
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
function start() {
  disposeTrio?.();
  session = read(prefix + read(activeKey));
  session ??= {
    id: crypto.randomUUID(), secret: crypto.randomUUID(), sides: assignSides(form.trials),
    index: 0, rows: {}, revision: 0, ack: 0, complete: false,
  };
  save();
  render();
  sync();
}

function updateStatus() {
  const count = Object.keys(session.rows).length;
  let message;
  if (preview) message = 'Preview · answers stay in this browser';
  else if (!count) message = 'Anonymous answers save online when connected.';
  else if (session.ack === session.revision) message = count + ' of ' + form.total_trials + ' answers saved online';
  else if (!navigator.onLine || syncFailed) message = 'Waiting for a connection to save answers online.';
  else message = 'Saving answers online…';
  if (!storedLocally) message += ' Browser storage is unavailable. Keep this tab open until you finish.';
  $('sync-status').textContent = message;
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
      const response = await fetch(collector, {method:'POST', credentials:'omit',
        headers:{'Content-Type':'application/json'}, signal:AbortSignal.timeout(12000),
        body:JSON.stringify({version:'v21', id, secret:record.secret, revision, answers, complete:record.complete})});
      if (!response.ok) throw Error('Submission failed');
      const saved = await response.json();
      if (saved.id !== id || saved.revision !== revision) throw Error('Missing receipt');
      const latest = session.id === id ? session : read(prefix + id);
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

function render() {
  disposeTrio?.();
  $('study-header').hidden = session.complete;
  $('save-status').hidden = session.complete;
  $('progress-display').hidden = session.complete;
  $('trial-screen').hidden = session.complete;
  $('finish-screen').hidden = !session.complete;
  updateProgressText(session.index+1,form.total_trials);
  if (session.complete) {
    $('download-csv').focus({preventScroll:true});
  } else {
    const trial = form.trials[session.index];
    openedAt = Date.now();
    $('feedback').textContent = '';
    showTrio(trial);
    const question = config.questions.PartA_Pairwise.choice;
    const field = node('fieldset','answer-group');
    field.append(node('legend','',question.label_en));
    const choices = node('div','options');
    for (const {value, label_en} of question.options) {
      const option = node('label','option');
      const input = node('input');
      input.type = 'radio';
      input.name = 'choice_raw';
      input.value = value;
      input.checked = session.rows[trial.item_id]?.choice_raw === value;
      input.addEventListener('change', () => choose(trial,value));
      option.append(input,node('span','',label_en));
      choices.append(option);
    }
    field.append(choices);
    $('answers').replaceChildren(field);
    $('previous').disabled = session.index === 0;
    $('continue').disabled = !session.rows[trial.item_id];
    $('continue').textContent = session.index === form.total_trials-1 ? 'Finish' : 'Next';
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
function downloadCsv() {
  if (!session.complete || Object.keys(session.rows).length !== form.total_trials) return;
  const rows = Object.values(session.rows).sort((a,b) => a.order_index-b.order_index);
  const cell = value => '"' + String(value ?? '').replaceAll('"','""') + '"';
  const lines = [csvFields.join(','), ...rows.map(row => csvFields.map(k => cell(row[k])).join(','))];
  const payload = '\uFEFF' + lines.join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob([payload], {type:'text/csv;charset=utf-8'}));
  const link = node('a');
  link.href = url;
  link.download = 'FAVE-' + config.version + '-' + (preview?'preview-':'') + session.id + '.csv';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('previous').onclick = () => navigate(-1);
$('continue').onclick = () => navigate(1);
$('download-csv').onclick = downloadCsv;
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
