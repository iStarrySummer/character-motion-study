'use strict';

const {config: bundledConfig, forms} = window.FAVE_STUDY;
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const activeKey = 'fave53-v18:active';
const csvFields = [
  'participant_id', 'form_id', 'order_index', 'item_id', 'part', 'role', 'task',
  'character', 'scene_id', 'left_setting', 'right_setting', 'diff_score',
  'both_resemble_reference', 'choice_raw', 'picked_setting', 'reason_tags', 'qc_passed', 'rt_ms', 'submitted_at',
];

let config = bundledConfig;
let session;
let storageKey;
let disposeTrio = null;
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
  for (const task of ['audio', 'prompt', 'lora']) {
    const items = shuffled(trials.filter(trial => trial.task === task));
    const oneSide = items.length % 2 ? shuffled([false, true])[0] : false;
    const testOnLeft = Math.floor(items.length / 2) + Number(oneSide);
    items.forEach((trial, index) => { result[trial.item_id] = index < testOnLeft; });
  }
  return result;
}

function route(part) {
  $('start-screen').hidden = part !== 'start';
  $('trial-screen').hidden = part !== 'trial';
  $('finish-screen').hidden = part !== 'finish';
  $('progress-display').hidden = part === 'start';
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(session));
    return true;
  } catch {
    const status = $('trial-screen').hidden ? $('start-status') : $('feedback');
    status.textContent = 'This browser could not save progress. Keep this tab open until you export your answers.';
    return false;
  }
}

function start(mode) {
  const formNum = $('form-picker').value;
  const form = forms[formNum];
  const enteredId = $('participant-id').value.trim();
  const participantId = mode === 'study' ? enteredId : 'Preview-' + form.form_id;
  if (!participantId) {
    $('participant-id').setCustomValidity('Enter an anonymous participant ID');
    $('participant-id').reportValidity();
    return;
  }

  storageKey = ['fave53-v18', mode, form.form_id, participantId].join(':');
  let previous;
  try { previous = JSON.parse(localStorage.getItem(storageKey)); }
  catch { previous = null; }

  session = previous ?? {
    mode,
    formNum,
    participantId,
    startedAt: Date.now(),
    index: 0,
    sides: assignSides(form.trials),
    responses: [],
    savedDrafts: {},
    draft: null,
    completedAt: null,
  };
  const currentUrl = new URL(location.href);
  currentUrl.searchParams.set('form', formNum);
  if (mode !== 'study') currentUrl.searchParams.set('preview', '1');
  else currentUrl.searchParams.delete('preview');
  try { history.replaceState(null, '', currentUrl); }
  catch { /* Some browsers restrict URL updates for local files */ }
  try {
    if (mode === 'study') sessionStorage.setItem(activeKey, JSON.stringify({formNum, participantId}));
    else sessionStorage.removeItem(activeKey);
  } catch { /* In-progress responses can still be reopened by participant ID */ }
  if (session.completedAt) showFinish();
  else renderTrial();
}

function showSetup() {
  disposeTrio?.();
  session = null;
  try { sessionStorage.removeItem(activeKey); }
  catch { /* Storage may be unavailable for local previews */ }
  const url = new URL(location.href);
  url.searchParams.delete('preview');
  try { history.replaceState(null, '', url); }
  catch { /* Some browsers restrict URL updates for local files */ }
  route('start');
}

function instructions() {
  const steps = [
    ['Watch the head', ['Compare the head turns and tilts in A and B', 'Look at how far and how often each head moves']],
    ['Watch the face', ['Look at the brows, eyes and mouth', 'Compare when each expression changes']],
    ['Answer both questions', ['First decide how similar A and B look', 'Your first answer reveals the reference in the middle']],
  ];
  const list = node('ol', 'guide-steps step-timeline');
  for (const [index, [heading, detail]] of steps.entries()) {
    const item = node('li');
    const title = node('h2');
    title.append(node('span', 'step-number', String(index + 1)), document.createTextNode(heading));
    const bullets = node('ul', 'step-details');
    for (const text of detail) bullets.append(node('li', '', text));
    item.append(title, bullets);
    list.append(item);
  }
  $('step-list').replaceChildren(list);
}

function mergedRanges(ranges) {
  const sorted = ranges.slice().sort((a, b) => a[0] - b[0]);
  const result = [];
  for (const [start, end] of sorted) {
    const last = result.at(-1);
    if (last && start <= last[1] + .015) last[1] = Math.max(last[1], end);
    else result.push([start, end]);
  }
  return result;
}

function progressPct(watch, duration) {
  if (watch.complete) return 100;
  const covered = watch.ranges.reduce((total, [from, to]) => total + to - from, 0);
  return Number.isFinite(duration) ? Math.min(99, Math.floor(100 * covered / duration)) : 0;
}

function showTrio(trial) {
  const draft = session.draft;
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
  title.append(node('h2', '', 'Compare the movements'));
  candidatePanel.append(title);
  const control = node('button', 'play-button play-both', 'Play all');
  control.type = 'button';
  title.append(control);
  const displays = [];
  const badges = [];
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
    frame.append(canvas);
    if (!side) {
      canvas.id = 'reference-picture';
      canvas.hidden = draft.diff_score === null;
      const mask = node('p', 'reference-mask', 'Answer question 1 to reveal the reference');
      mask.id = 'reference-mask';
      mask.hidden = !canvas.hidden;
      frame.append(mask);
    }
    if (side) {
      const badge = node('span', 'watch-badge');
      badge.setAttribute('aria-label', 'Percent watched');
      badges.push(badge);
      frame.append(badge);
    }
    frame.addEventListener('click', () => { if (!canvas.hidden) toggleAll(); });
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
  const watch = draft.watch[0];
  const previousRanges = watch.ranges.map(range => range.slice());
  function paintBadges() {
    const percent = progressPct(watch, video.duration);
    for (const badge of badges) {
      badge.textContent = percent + '%';
      badge.style.setProperty('--watched', percent + '%');
    }
  }
  function track() {
    if (!live || session?.draft !== draft || watch.complete || !Number.isFinite(video.duration)) return;
    const played = Array.from({length: video.played.length}, (_, i) => [video.played.start(i), video.played.end(i)]);
    watch.ranges = mergedRanges(previousRanges.concat(played));
    watch.position = video.currentTime;
    const covered = watch.ranges.reduce((sum, [from, to]) => sum + to - from, 0);
    watch.complete = video.ended && covered >= video.duration - Math.min(.06, video.duration * .02);
    Object.assign(draft.watch[1], watch);
    paintBadges();
    updateGate();
    save();
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
  video.addEventListener('loadedmetadata', () => {
    if (!watch.complete && watch.position > 0 && watch.position < video.duration) video.currentTime = watch.position;
    paintBadges();
  });
  video.addEventListener('loadeddata', paint);
  video.addEventListener('seeked', paint);
  video.addEventListener('play', setButton);
  video.addEventListener('pause', () => { setButton(); track(); });
  video.addEventListener('timeupdate', track);
  video.addEventListener('ended', () => {
    if (!live || session?.draft !== draft) return;
    track();
    video.currentTime = 0;
    playAll();
  });
  video.addEventListener('error', () => {
    if (live) $('feedback').textContent = 'The comparison video could not be loaded';
  });
  disposeTrio = () => {
    track();
    live = false;
    if (nativeFrames) video.cancelVideoFrameCallback(frameRequest);
    else cancelAnimationFrame(frameRequest);
    video.pause();
    video.removeAttribute('src');
    video.load();
    disposeTrio = null;
  };
  paintBadges();
  video.src = window.FAVE_TRIOS[trial.item_id];
  nextFrame();
  playAll();
}

function questionField(question, number) {
  const field = question.field;
  const item = node('fieldset', 'answer-group');
  const legend = node('legend', '', question.label_en);
  if (number) legend.prepend(node('span', 'question-number', String(number)), ' ');
  item.append(legend);
  const multiple = question.multi_select === true;
  const choices = node('div', 'options');
  for (const {value, label_en: label} of question.options) {
    const option = node('label', 'option');
    const input = node('input');
    input.type = multiple ? 'checkbox' : 'radio';
    input.name = field;
    input.value = String(value);
    input.checked = multiple ? session.draft[field].includes(value) : session.draft[field] === value;
    input.addEventListener('change', () => {
      const draft = session.draft;
      if (multiple) {
        if (input.checked && !draft[field].includes(value)) draft[field].push(value);
        if (!input.checked) draft[field] = draft[field].filter(tag => tag !== value);
      } else {
        draft[field] = value;
        if (field === 'diff_score') {
          draft.choice_raw = null;
          draft.both_resemble_reference = null;
          draft.reason_tags = [];
          showFollowUp();
        } else if (field === 'choice_raw') {
          draft.reason_tags = [];
          showReasons();
        }
      }
      updateGate();
      save();
    });
    option.append(input, node('span', '', label));
    choices.append(option);
  }
  item.append(choices);
  return item;
}

function showReasons() {
  $('reason-tags')?.remove();
  if (!session.draft.choice_raw) return;
  const reasons = questionField(config.questions.PartA_Pairwise.q3_reasons_optional);
  reasons.id = 'reason-tags';
  reasons.querySelector('legend').append(' (optional, select all that apply)');
  const choices = reasons.querySelector('.options');
  const labels = [...choices.children];
  const numbers = ['1', '2.1', '2.2', '2.3'];
  labels.forEach((label, index) => {
    label.querySelector('span').prepend(node('strong', 'reason-number', numbers[index]), ' ');
  });
  const faceOptions = node('div', 'face-options');
  faceOptions.append(...labels.slice(1));
  choices.replaceChildren(labels[0], faceOptions);
  $('answers').append(reasons);
}

function showFollowUp() {
  $('follow-up')?.remove();
  $('reason-tags')?.remove();
  const {diff_score} = session.draft;
  $('reference-picture').hidden = diff_score === null;
  $('reference-mask').hidden = diff_score !== null;
  if (diff_score === null) return;
  const pair = config.questions.PartA_Pairwise;
  const followUp = questionField(diff_score === 0 ? pair.q2_reference : pair.q2_choice, 2);
  followUp.id = 'follow-up';
  $('answers').append(followUp);
  if (diff_score === 1) showReasons();
}

function showAnswers() {
  $('answers').replaceChildren(questionField(config.questions.PartA_Pairwise.q1_diff, 1));
  showFollowUp();
}

function getTrial() {
  return forms[session.formNum].trials[session.index];
}

function updateGate() {
  const draft = session.draft;
  const complete = draft.watch.every(watch => watch.complete);
  const answered = (draft.diff_score === 0 && draft.both_resemble_reference !== null) ||
    (draft.diff_score === 1 && draft.choice_raw !== null);
  $('continue').disabled = !complete || !answered;
  $('feedback').textContent = !complete ? 'Watch both candidates to the end'
    : (!answered ? 'Answer both questions to continue' : '');
}

function updateProgressText(position, total) {
  const bar = $('progress');
  bar.max = total;
  bar.value = position;
  $('progress-count').textContent = 'Question ' + position + ' / ' + total;
  bar.setAttribute('aria-valuetext', 'Question ' + position + ' of ' + total);
}

function renderTrial() {
  disposeTrio?.();
  const trial = getTrial();
  if (!session.draft && session.savedDrafts[trial.item_id]) session.savedDrafts[trial.item_id].openedAt = Date.now();
  session.draft ??= session.savedDrafts[trial.item_id] ?? {
    openedAt: Date.now(),
    choice_raw: null,
    diff_score: null,
    both_resemble_reference: null,
    reason_tags: [],
    watch: Array.from({length: 2}, () => ({ranges: [], complete: false, position: 0})),
  };
  updateProgressText(session.index + 1, forms[session.formNum].total_trials);
  route('trial');
  instructions();
  showTrio(trial);
  showAnswers();
  $('previous').disabled = session.index === 0;
  $('continue').textContent = session.index + 1 === forms[session.formNum].total_trials ? 'Finish' : 'Next';
  updateGate();
  save();
  window.scrollTo(0, 0);
}

function leaveQuestion(now) {
  disposeTrio?.();
  const draft = session.draft;
  draft.elapsedMs = (draft.elapsedMs || 0) + Math.max(0, now - draft.openedAt);
  session.savedDrafts[getTrial().item_id] = draft;
  session.draft = null;
}

function previousQuestion() {
  if ($('previous').disabled || !session.draft) return;
  leaveQuestion(Date.now());
  session.index--;
  renderTrial();
}

function submit() {
  if ($('continue').disabled || !session.draft) return;
  const trial = getTrial();
  const draft = session.draft;
  const swap = session.sides[trial.item_id];
  const left = swap ? trial.test_setting : trial.base_setting;
  const right = swap ? trial.base_setting : trial.test_setting;
  const submitted = Date.now();
  leaveQuestion(submitted);
  const response = {
    participant_id: session.participantId,
    form_id: trial.form_id,
    order_index: trial.order_index,
    item_id: trial.item_id,
    part: trial.part,
    role: trial.role,
    task: trial.task,
    character: trial.character,
    scene_id: trial.scene_id,
    left_setting: left,
    right_setting: right,
    diff_score: draft.diff_score,
    choice_raw: draft.choice_raw,
    both_resemble_reference: draft.both_resemble_reference,
    picked_setting: ({A: left, B: right})[draft.choice_raw] ?? null,
    reason_tags: [...draft.reason_tags],
    qc_passed: trial.role === 'qc_pair' ? draft.diff_score === 0 : null,
    rt_ms: draft.elapsedMs,
    submitted_at: new Date(submitted).toISOString(),
  };
  const index = session.responses.findIndex(row => row.item_id === trial.item_id);
  if (index < 0) session.responses.push(response);
  else session.responses[index] = response;
  if (session.index + 1 === forms[session.formNum].total_trials) {
    session.completedAt = submitted;
    save();
    showFinish();
  } else {
    session.index++;
    renderTrial();
  }
}

function showFinish() {
  disposeTrio?.();
  route('finish');
  updateProgressText(forms[session.formNum].total_trials, forms[session.formNum].total_trials);
  $('finish-message').textContent = session.responses.length + ' answers ready to download';
  window.scrollTo(0, 0);
}

function exportSession(ext) {
  const elapsed = Math.max(0, (session.completedAt - session.startedAt) / 1000);
  const isStudy = session.mode === 'study';
  const qualityChecks = session.responses.filter(record => record.qc_passed !== null);
  const summary = {
    study_version: 'v19',
    participant_id: session.participantId,
    form_id: forms[session.formNum].form_id,
    mode: session.mode,
    total_duration_sec: elapsed,
    participant_valid: isStudy && qualityChecks.length === 1 &&
      qualityChecks.every(record => record.qc_passed) && elapsed >= config.qc_rules.min_total_duration_sec,
  };
  function cell(value) {
    const result = Array.isArray(value) ? value.join('|') : String(value ?? '');
    return /[",\n\r]/.test(result) ? '"' + result.replaceAll('"', '""') + '"' : result;
  }
  const isCsv = ext === 'csv';
  const payload = isCsv
    ? '\uFEFF' + [csvFields.join(','), ...session.responses.map(row =>
      csvFields.map(field => cell(row[field])).join(','))].join('\r\n') + '\r\n'
    : JSON.stringify({session: summary, responses: session.responses}, null, 2) + '\n';
  const href = URL.createObjectURL(new Blob([payload],
    {type: isCsv ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8'}));
  const link = node('a');
  link.href = href;
  const filename = session.participantId.replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = 'FAVE-v19-' + forms[session.formNum].form_id + '-' + filename + '.' + ext;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

async function loadConfig() {
  if (location.protocol !== 'file:') {
    try {
      const response = await fetch('./config/study_config.json', {cache: 'no-store'});
      if (response.ok) config = await response.json();
    } catch { /* The bundled configuration supports the offline preview */ }
  }

}

$('start-preview').disabled = true;
$('start-study').disabled = true;
if (forms[params.get('form')]) $('form-picker').value = params.get('form');
$('participant-id').addEventListener('input', () => $('participant-id').setCustomValidity(''));
$('start-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!$('start-study').disabled) start('study');
});
$('start-preview').addEventListener('click', () => start('preview'));
$('previous').addEventListener('click', previousQuestion);
$('continue').addEventListener('click', submit);
$('download-csv').addEventListener('click', () => exportSession('csv'));
$('download-json').addEventListener('click', () => exportSession('json'));
$('return-home').addEventListener('click', showSetup);
loadConfig().then(() => {
  $('start-study').disabled = false;
  $('start-preview').disabled = false;
  const previewMode = params.get('preview');
  if (previewMode === '1' || previewMode === 'id') {
    start('preview');
    return;
  }
  let active;
  try { active = JSON.parse(sessionStorage.getItem(activeKey)); }
  catch { active = null; }
  if (active && forms[active.formNum] && (!params.has('form') || params.get('form') === active.formNum)) {
    $('form-picker').value = active.formNum;
    $('participant-id').value = active.participantId;
    start('study');
  }
});
