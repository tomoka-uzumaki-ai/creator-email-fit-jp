/* Keep preparation in this tab. Only optional aggregate counts enter an internal URL fragment. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);let note='';
 function clear(){note='';$('brief-result').hidden=true;$('brief-download').disabled=true;$('brief-next').href='../contract-cost/';$('brief-error').textContent='';}
 $('brief-form').addEventListener('input',clear);$('brief-form').addEventListener('change',clear);
 $('brief-form').onsubmit=e=>{e.preventDefault();clear();try{
  const input=Object.fromEntries(['job','tried','goal','contacts','messages','term','monthly','setup','additional'].map(k=>[k,$('brief-'+k).value]));input.costChecked=$('brief-cost-checked').checked;
  const result=PhoneSupportBrief.build(input);note=result.note;$('brief-report').textContent=note;
  $('brief-next').href='../contract-cost/'+(result.counts?AggregateHandoff.encode(result.counts):'');
  $('brief-transfer').textContent=result.counts?'登録連絡先数と月間通数だけを、URL末尾で次画面へ渡します。次画面で受け取るとURLから取り除きます。リンクを他人へ共有しないでください。契約期間・費用・必要性・引継ぎ・適用確認は自動入力せず、次画面で確認します。':'人数や通数は未確認、または0です。次画面へ数量を自動入力しません。期間・費用・必要性・引継ぎ・適用確認も次画面で確認してください。';
  $('brief-result').hidden=false;$('brief-download').disabled=false;
 }catch(err){$('brief-error').textContent=err.message;}};
 $('brief-download').onclick=()=>{if(!note)return;const u=URL.createObjectURL(new Blob([note],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='mail-phone-support-brief.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
 const imported=AggregateHandoff.consume('plan');
 if(imported&&imported.contacts<=1000000&&imported.messages<=10000000){$('brief-contacts').value=imported.contacts;$('brief-messages').value=imported.messages;$('brief-import-note').textContent='確認した登録数と月間通数を受け取りました。相談したい作業や期間・費用の確認状態は引き継いでいません。';}
 clear();
})();
