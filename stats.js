'use strict';
const $ = id => document.getElementById(id);
const names = {setting_01:'Original audio', setting_03:'TTS-E', setting_05:'TTS-N', setting_07:'LoRA on'};
function label(t,side) {
  if (t.task === 'lora') return side === 'base' ? 'LoRA off' : 'LoRA on ('+t.lora_weights+')';
  return names[t[side+'_setting']] || t[side+'_setting'];
}
function renderRow(t,first) {
  const row=document.createElement('tr');
  const count=t.test+t.base;
  const rate=count ? (100*t.test/count).toFixed(1)+'% ('+t.test+'/'+count+')' : '—';
  for (const value of [...first,label(t,'base')+' · '+t.base,label(t,'test')+' · '+t.test,rate]) {
    const cell=document.createElement('td');cell.textContent=value;row.append(cell);
  }
  return row;
}
let refresh;
let lastRequest=0;
async function load() {
  const request=++lastRequest;
  clearTimeout(refresh);
  try {
    const response=await fetch('https://fave-motion-results.helpfulchick2.chatgpt.site/api/stats',{
      headers:{Authorization:'Bearer '+$('key').value.trim()},cache:'no-store',signal:AbortSignal.timeout(15000)});
    if (response.status===401) throw Error('Check the researcher key and try again.');
    if (!response.ok) throw Error('Could not load the results.');
    const data=await response.json();
    if (request!==lastRequest) return;
    const groups=new Map();
    for (const t of data.items) {
      const key=[t.character,t.task,t.base_setting,t.test_setting,t.lora_weights].join('|');
      const g=groups.get(key) || {...t,base:0,test:0};g.base+=t.base;g.test+=t.test;groups.set(key,g);
    }
    const answers=data.items.reduce((sum,t)=>sum+t.base+t.test,0);
    $('totals').textContent=data.participants+' started answering · '+data.completed+' finished · '+answers+' answers';
    $('groups').replaceChildren(...Array.from(groups.values()).sort((a,b)=>a.character.localeCompare(b.character)||a.task.localeCompare(b.task))
      .map(t=>renderRow(t,[t.character,t.task==='lora'?'LoRA':'Audio'])));
    $('items').replaceChildren(...data.items.map(t=>renderRow(t,[t.order_index,t.character,t.scene_id])));
    $('results').hidden=false;
    $('status').textContent='Updated '+new Date().toLocaleTimeString()+'. Refreshes every 30 seconds.';
    refresh=setTimeout(load,30000);
  } catch(error) {
    if (request!==lastRequest) return;
    $('results').hidden=true;
    $('status').textContent=error.message;
  }
}
$('access').onsubmit=event=>{event.preventDefault();load();};
