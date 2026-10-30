/* A user-owned preparation note, not a support, price or contract decision. */
(function(root){
 'use strict';
 function text(value,label,required,max){const s=String(value??'').trim();if(required&&!s)throw Error(label+'を一つ書いてください。');if(s.length>max)throw Error(label+'は'+max+'文字以内にしてください。');return s;}
 function integer(value,label,max){const s=String(value??'').trim();if(!s)return null;if(!/^(?:0|[1-9]\d*)$/.test(s)||!Number.isSafeInteger(Number(s))||Number(s)>max)throw Error(label+'は0〜'+max.toLocaleString('ja-JP')+'の整数で入力してください。不明なら空欄にします。');return Number(s);}
 function build(input){
  const data={job:text(input.job,'終わっていない作業',true,1200),tried:text(input.tried,'既に試したこと',false,1200),goal:text(input.goal,'解決できたと判断する状態',true,1200),contacts:integer(input.contacts,'重複しない登録連絡先数',1000000),messages:integer(input.messages,'月間通数',10000000),term:String(input.term??''),monthly:integer(input.monthly,'確認済み月額',100000000),setup:integer(input.setup,'確認済み初期費用',100000000),additional:integer(input.additional,'期間全体の追加費用',100000000),costChecked:input.costChecked===true};
  if(!['','3','6','12'].includes(data.term))throw Error('契約期間は未確認・3・6・12か月から選んでください。');
  const costs=[data.monthly,data.setup,data.additional];
  if(costs.some(v=>v!==null)&&!data.costChecked)throw Error('金額を残す場合は、自分の人数・期間に適用する費用を確認したチェックが必要です。0は費用なしと確認した場合だけ入力します。不明なら金額を空欄にしてください。');
  if(costs.some(v=>v!==null)&&!data.term)throw Error('費用を残す場合は、その費用を確認した契約期間を選んでください。不明なら金額を空欄にします。');
  const number=v=>v===null?'未確認':v.toLocaleString('ja-JP'),yen=v=>v===null?'未確認':number(v)+'円（本人が適用額を確認）';
  const note=['メール配信｜電話相談の準備メモ','本人の入力を整理したものです。提供会社への送信・申込みは行っていません。','','終わっていない作業：',data.job,'','既に試したこと：',data.tried||'未記入・これから整理','', '解決できたと判断する状態：',data.goal,'','重複しない登録連絡先数：'+number(data.contacts),'月間通数（テスト・追加を含む）：'+number(data.messages),'費用を確認した契約期間：'+(data.term?data.term+'か月':'未確認'),'確認済み月額（税抜）：'+yen(data.monthly),'確認済み初期費用（税抜）：'+yen(data.setup),'同期間全体の追加費用（税抜）：'+yen(data.additional),'','未確認の人数・通数・費用は、ゼロや適用済みに置き換えていません。','このメモは総額計算・予算適合・電話支援の対象認定ではありません。','今の無料方法で作業が終わる場合は、契約や移行は不要です。','必要な場合だけ、既存の契約総額画面で期間・費用・適用条件・引継ぎを別途確認してください。','https://tomoka-uzumaki-ai.github.io/creator-email-fit-jp/contract-cost/'].join('\n');
  const counts=data.contacts!==null&&data.contacts>0&&data.messages!==null&&data.messages>0?{v:1,stage:'plan',contacts:data.contacts,messages:data.messages}:null;
  return {data,note,counts};
 }
 const api={build};root.PhoneSupportBrief=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
