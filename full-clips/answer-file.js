'use strict';
window.AnswerFile = (() => {
  const {form,config} = window.FAVE_STUDY;
  const fields = ['study_version','participant_id','form_id','order_index','item_id','round','task','character','scene_id',
    'audio_comparison','lora_weights','left_setting','right_setting','choice_raw','picked_setting','rt_ms','submitted_at'];
  function csv(rows) {
    const cell = value => '"' + String(value ?? '').replaceAll('"','""') + '"';
    return [fields.join(','),...rows.map(row=>fields.map(k=>cell(row[k])).join(','))].join('\r\n')+'\r\n';
  }
  function fileUrl(text) {
    return URL.createObjectURL(new Blob(['\uFEFF',text],{type:'text/csv;charset=utf-8'}));
  }
  function portableLink(id,rows) {
    const data = rows.map(row=>[row.left_setting,row.choice_raw,row.rt_ms,row.submitted_at]);
    const url = new URL('export.html',location.href);
    url.hash = btoa(JSON.stringify([id,data])).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
    return url.href;
  }
  function readLink(fragment) {
    if (!fragment || fragment.length>1800) throw Error('invalid');
    const [id,data] = JSON.parse(atob(fragment.replaceAll('-','+').replaceAll('_','/')));
    if (typeof id!=='string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id) ||
        !Array.isArray(data) || data.length!==form.trials.length) throw Error('invalid');
    const rows = form.trials.map((t,i)=>{
      const [left,choice,rt,at] = data[i];
      if (![t.base_setting,t.test_setting].includes(left) || !['A','B'].includes(choice) ||
          !Number.isSafeInteger(rt) || rt<0 || typeof at!=='string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(at)) throw Error('invalid');
      const right=left===t.base_setting?t.test_setting:t.base_setting;
      return {...t,study_version:config.version,participant_id:id,left_setting:left,right_setting:right,
        choice_raw:choice,picked_setting:choice==='A'?left:right,rt_ms:rt,submitted_at:at};
    });
    return {id,text:csv(rows)};
  }
  return {csv,fileUrl,portableLink,readLink};
})();
