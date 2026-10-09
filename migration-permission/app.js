'use strict';
const A=AliasChecks,$=id=>document.getElementById(id),kind=document.body.dataset.job;let report=null;
const revisions=new Map(),pendingImports=new Set(),latestImports=new Map();
function revision(id){return revisions.get(id)||0;}
function confirmState(){for(const button of $('form').querySelectorAll('button'))button.disabled=pendingImports.size>0;}
function stale(){report=null;$('result').hidden=true;$('error').textContent='入力が変わりました。再確認してください。';$('csv-save').disabled=$('txt-save').disabled=true;$('help').hidden=true;}
function changed(id){revisions.set(id,revision(id)+1);stale();}
for(const id of ['input','before','after','topic','synthetic'])if($(id))$(id).addEventListener('input',()=>changed(id));
for(const id of ['file','before-file','after-file'])if($(id))$(id).addEventListener('change',async()=>{
 const target=id==='before-file'?'before':id==='after-file'?'after':'input';changed(target);
 const token={target,ticket:revision(target)};pendingImports.add(token);latestImports.set(target,token);confirmState();$('error').textContent='ファイルを読み込んでいます。完了してから確認してください。';
 try{const f=$(id).files[0];if(!f)return;if(f.size>A.MAX_BYTES)throw Error('最大1 MiBです。');const text=await f.text();A.records(text,kind==='batches');if(token.ticket!==revision(target))return;
  // Invalidate again before committing: an old report must never describe new input.
  stale();$(target).value=text;$('error').textContent='形式を確認して読み込みました。結果を再確認してください。';
 }catch(e){if(token.ticket===revision(target))$('error').textContent='未確認：'+e.message;}
 finally{pendingImports.delete(token);if(latestImports.get(target)===token){latestImports.delete(target);$(id).value='';}confirmState();}
});
$('sample').addEventListener('click',()=>{for(const id of ['input','before','after'])revisions.set(id,revision(id)+1);stale();$('synthetic').checked=true;const header='alias,permission,withdrawn,topics\n';if(kind==='migration'){$('before').value=header+'p001,yes,yes,story\np002,yes,no,story|notes\np003,unknown,no,notes\n';$('after').value=header+'p001,yes,no,story\np002,yes,no,notes\np004,yes,no,story\n';}else if(kind==='batches')$('input').value='campaign,batch,alias,topic,permission,withdrawn,topics\nc001,b001,p001,story,yes,no,story|notes\nc001,b002,p001,notes,yes,no,story|notes\nc001,b001,p002,story,unknown,no,story\nc001,b002,p003,notes,yes,yes,notes\nc002,b001,p001,story,yes,no,story|notes\n';else $('input').value=header+'p001,yes,no,story\np002,yes,yes,story|notes\np003,unknown,no,story\np004,yes,no,notes\np005,yes,unknown,story\n';});
$('form').addEventListener('submit',e=>{e.preventDefault();report=null;$('result').hidden=true;$('csv-save').disabled=$('txt-save').disabled=true;$('help').hidden=true;try{if(pendingImports.size)throw Error('ファイル読込み中です。完了後に再確認してください。');if(!$('synthetic').checked)throw Error('氏名・アドレス・対応表を含まない仮IDと状態だけであることを確認してください。');let topic=$('topic')?.value||'story';report=kind==='migration'?A.migration(A.records($('before').value),A.records($('after').value),topic):kind==='batches'?A.batches(A.records($('input').value,true)):A.permission(A.records($('input').value),topic);$('report').textContent=A.txt(report);$('result').hidden=false;$('csv-save').disabled=$('txt-save').disabled=false;$('error').textContent='記入した状態を確認しました。実際の配信可否は未認定です。';$('help').hidden=!$('need').checked;}catch(err){$('error').textContent='未確認：'+err.message;}});
$('need').addEventListener('change',()=>{$('help').hidden=!report||!$('need').checked;});
function save(text,name,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('csv-save').addEventListener('click',()=>{if(report&&!pendingImports.size)save(A.csv(report),kind+'-review.csv','text/csv;charset=utf-8');});$('txt-save').addEventListener('click',()=>{if(report&&!pendingImports.size)save(A.txt(report),kind+'-review.txt','text/plain;charset=utf-8');});

confirmState();
