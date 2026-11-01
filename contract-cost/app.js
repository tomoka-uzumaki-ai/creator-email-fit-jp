const $=id=>document.getElementById(id);
function saveText(name,text,type='text/plain;charset=utf-8'){const u=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
let report='';
function clearResult(){report='';$('result').hidden=true;$('buy').hidden=true;$('download').disabled=true;}
const yen=value=>value===null?'未確認':value.toLocaleString('ja-JP')+'円';
function inputChanged(event){if(['contacts','messages','term','setup','additional'].includes(event.target?.id))$('price-checked').checked=false;clearResult();}
$('form').addEventListener('input',inputChanged);
$('form').addEventListener('change',inputChanged);
$('form').onsubmit=e=>{
  e.preventDefault();clearResult();
  try{
    const q=ContractCost.quote({contacts:$('contacts').value,messages:$('messages').value,term:$('term').value,setup:$('setup').value,additional:$('additional').value});
    const decision=ContractCost.assess(q,{budget:$('budget').value,priceChecked:$('price-checked').checked,need:$('need').checked,handoff:$('handoff').checked});
    if(!q){$('heading').textContent='標準表示枠を超えています';report='個別見積の確認が必要です。表示料金を外挿しません。';}
    else{
      $('heading').textContent=q.total===null?'総額は未確定 — 費用の確認を続ける':yen(q.total)+' — '+q.term+'か月の税込計算例';
      report='登録枠 '+q.tier[0]+'件 / 月間枠 '+q.tier[1]+'通\n月額 '+yen(q.tier[2])+'（税抜）\n月額部分の期間合計 '+yen(q.monthlyNet)+'（税抜）\n初期費用 '+yen(q.setup)+(q.setup===null?'':'（税抜・自分で確認した額）')+'\n期間全体の追加費用 '+yen(q.additional)+(q.additional===null?'':'（税抜・自分で確認した額）');
      if(q.total!==null)report+='\n期間総額 '+yen(q.net)+'（税抜）\n消費税10%の単純計算 '+yen(q.tax)+'\n税込計算例 '+yen(q.total);
      else report+='\n未確認項目が残るため、税込総額と予算内かは判定しません。';
      report+='\n税込予算 '+yen(decision.budget)+'\n'+(decision.eligible?'入力した確認済み費用の計算例は予算内です。最終額・更新・解約・無料トライアル後の扱いは申込先で確認してください。':decision.reasons.join('\n'))+'\n\n現在の無料サービスで完了できるなら移行不要。税は10%の単純計算で、見積・契約・成果保証ではありません。';
    }
    $('report').textContent=report;$('result').hidden=false;$('download').disabled=false;$('buy').hidden=!decision.eligible;
  }catch(err){$('heading').textContent='入力を確認してください';$('report').textContent=err.message;$('result').hidden=false;}
};
$('download').onclick=()=>{if(report)saveText('mail-contract-comparison.txt',report);};
const imported=AggregateHandoff.consume('plan');
if(imported){$('contacts').value=imported.contacts;$('messages').value=imported.messages;$('import-note').textContent='計画の登録数・月間通数を受け取りました。電話支援の必要性、引継ぎ、適用料金と予算はここで確認してください。';}
clearResult();
