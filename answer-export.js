'use strict';

const csvFields = ['study_version','participant_id','form_id','order_index','item_id','round','task',
  'character','scene_id','audio_comparison','lora_weights','left_setting','right_setting',
  'choice_raw','picked_setting','rt_ms','submitted_at'];

function answerCsv(rows) {
  const cell = value => '"' + String(value ?? '').replaceAll('"','""') + '"';
  return [csvFields.join(','), ...rows.map(row => row.map(cell).join(','))].join('\r\n') + '\r\n';
}

function answerFile(name, rows) {
  return new File(['\uFEFF', answerCsv(rows)], name, {type:'text/csv;charset=utf-8'});
}

function downloadAnswerFile(file) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 60000);
}

// Only export columns travel with the link. The fragment stays on the device during HTTP requests.
function answerLink(bytes, format) {
  const url = new URL('export.html', location.href);
  const base64 = btoa(String.fromCharCode(...bytes));
  url.hash = format + '.' + base64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  return url.href;
}

async function readAnswerLink(hash) {
  const match = /^#(raw|gz)\.([\w-]{1,32000})$/.exec(hash);
  if (!match) throw Error('Invalid link');
  const binary = atob(match[2].replaceAll('-', '+').replaceAll('_', '/'));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream();
  const body = match[1] === 'gz' ? stream.pipeThrough(new DecompressionStream('gzip')) : stream;
  const {name, rows} = await new Response(body).json();
  if (typeof name !== 'string' || !/^FAVE-v\d+-(preview-)?[a-f0-9-]{36}\.csv$/.test(name) ||
      !Array.isArray(rows) || rows.length !== 30 ||
      !rows.every(row => Array.isArray(row) && row.length === csvFields.length &&
        row.every(value => value === null || Number.isSafeInteger(value) && value >= 0 ||
          typeof value === 'string' && /^(?:[A-Za-z0-9][A-Za-z0-9_.: -]{0,99})?$/.test(value)))) {
    throw Error('Invalid answer sheet');
  }
  return answerFile(name, rows);
}
