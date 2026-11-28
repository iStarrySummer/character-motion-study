'use strict';
const $ = id => document.getElementById(id);
const characters = {Penny:'佩妮', Sheldon:'谢尔顿', Leonard:'莱纳德'};
const characterName = name => characters[name] || name;
const names = {setting_01:'原始音频', setting_03:'TTS-E', setting_05:'TTS-N', setting_07:'启用 LoRA'};
function label(t,side) {
  if (t.task === 'lora') return side === 'base' ? '关闭 LoRA' : '启用 LoRA（'+characterName(t.lora_weights)+'的权重）';
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
    const response=await fetch('https://fave-motion-results.helpfulchick2.chatgpt.site/api/v28/stats',{
      headers:{Authorization:'Bearer '+$('key').value.trim()},cache:'no-store',signal:AbortSignal.timeout(15000)});
    if (response.status===401) {
      if (request===lastRequest) {
        $('results').hidden=true;
        $('status').textContent='密钥有误，请重新输入';
      }
      return;
    }
    if (!response.ok) throw Error('Could not load the results.');
    const data=await response.json();
    if (request!==lastRequest) return;
    const groups=new Map();
    for (const t of data.items) {
      const key=[t.character,t.task,t.base_setting,t.test_setting,t.lora_weights].join('|');
      const g=groups.get(key) || {...t,base:0,test:0};g.base+=t.base;g.test+=t.test;groups.set(key,g);
    }
    const answers=data.items.reduce((sum,t)=>sum+t.base+t.test,0);
    $('totals').textContent=data.participants+' 份答卷已开始，'+data.completed+' 份已完成，共收到 '+answers+' 条答案';
    $('groups').replaceChildren(...Array.from(groups.values()).sort((a,b)=>a.character.localeCompare(b.character)||a.task.localeCompare(b.task))
      .map(t=>renderRow(t,[characterName(t.character),t.task==='lora'?'LoRA':'音频'])));
    $('items').replaceChildren(...data.items.map(t=>renderRow(t,[t.order_index,characterName(t.character),t.scene_id])));
    $('results').hidden=false;
    $('status').textContent='上次更新：'+new Date().toLocaleTimeString('zh-CN')+'，每 30 秒自动刷新';
    refresh=setTimeout(load,30000);
  } catch {
    if (request!==lastRequest) return;
    $('results').hidden=true;
    $('status').textContent='未能加载结果，请检查网络后重试';
  }
}
$('access').onsubmit=event=>{event.preventDefault();load();};

$('key').oninvalid = () => $('key').setCustomValidity('请输入研究者密钥');
$('key').oninput = () => $('key').setCustomValidity('');
