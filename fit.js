'use strict';
// Counts only; no recipients, storage, analytics, remote requests or sending.
(function (root) {
  const labels = {shortOnly:'短編だけの希望者',notesOnly:'ノートだけの希望者',both:'両方の希望者',shortRuns:'月の短編配信回数',notesRuns:'月のノート配信回数',extra:'月の追加通数',counted:'プランの登録者数',content:'自作内容',permission:'配信希望',unsubscribe:'解除後の除外',groups:'希望別宛先・手動変更',automation:'自動連続配信が必須',selfChange:'本人の即時希望変更が必須',current:'現プラン'};
  const valueLabels = {yes:'はい',no:'いいえ',unknown:'不明',kit:'Kit Free',mailerlite:'現行MailerLite Free',other:'ほか／未導入'};
  const fields = ['shortOnly', 'notesOnly', 'both', 'shortRuns', 'notesRuns', 'extra', 'counted'];
  function integer(value) {
    const s = String(value ?? '').trim();
    if (!/^\d+$/.test(s)) return null;
    const n = Number(s);
    return Number.isSafeInteger(n) && n <= 100000000 ? n : null;
  }
  function evaluate(input) {
    const n = Object.fromEntries(fields.map(k => [k, integer(input[k])]));
    const missing = fields.filter(k => n[k] === null);
    if (missing.length) return {status: 'unknown', text: '未判定：すべての集計欄に0以上の整数を入れてください。不明な値は空欄のままにし、0に置き換えないでください。'};
    const active = n.shortOnly + n.notesOnly + n.both;
    const messages = (n.shortOnly + n.both) * n.shortRuns + (n.notesOnly + n.both) * n.notesRuns + n.extra;
    if (!Number.isSafeInteger(active) || !Number.isSafeInteger(messages)) return {status: 'inconsistent', text: '未判定：集計範囲が大きすぎます。少ない範囲の整数で確認してください。'};
    const total = `今回配信する希望者 ${active}人／短編 ${n.shortOnly + n.both}人／ノート ${n.notesOnly + n.both}人／月の見込総通数 ${messages}通／プランが数える人数 ${n.counted}人。`;
    if (n.counted < active) return {status: 'inconsistent', text: `${total}\n未判定：プランのカウント対象人数が今回配信する希望者より少ないため、集計時点・除外・重複を確認してください。`};
    if (['content', 'permission', 'unsubscribe', 'groups'].some(k => input[k] !== 'yes')) return {status: 'unknown', text: `${total}\n未判定：自作内容、本人の希望、解除後の除外、希望別宛先の確認が必要です。「不明」と「いいえ」のどちらも、自動で配信可能にはしません。`};
    if (input.automation !== 'no' || input.selfChange !== 'no') return {status: 'workflow', text: `${total}\n未判定：自動連続配信・読者自身の希望変更は、人数と通数だけでは判断できません。既存サービスの具体的な分岐と無料機能を確認してください。有料契約が必要とはまだ判定していません。`};
    const ml = n.counted <= 250 && messages <= 2500;
    const kit = n.counted <= 10000;
    let route;
    if (input.current === 'mailerlite' && ml) route = '通常配信の数量面は現行MailerLite Free内。今の無料プランで宛先・解除・手動希望変更まで成立しているなら、移行・追加契約は不要です。';
    else if (input.current === 'kit' && kit) route = '通常配信の数量面はKit Freeの登録者上限内。今の無料プランで宛先・解除・手動希望変更まで成立しているなら、移行・追加契約は不要です。';
    else if (input.current === 'unknown') route = '現サービス・プランが不明なので選定は未判定。まず現プラン名と実際の人数・通数の数え方を確認してください。';
    else if (ml) route = '数量面ではMailerLite FreeとKit Freeが候補。既存の無料運用で同じ仕事が閉じるか先に確認し、移行を自動推奨しません。';
    else if (kit) route = '現行MailerLite Freeは人数または通数の上限外。Kit Freeの通常配信は数量面の候補ですが、取込許可・解除状態・希望変更の引継ぎを確認してから判断してください。有料Creatorの購入へ自動で進めません。';
    else route = '両サービスの今回確認した無料登録者条件の上限外。現プランと最新の料金・機能を確認してください。費用や移行効果は未判定です。';
    return {status: 'quantity_checked', active, messages, counted: n.counted, ml, kit, text: `${total}\n${route}\n2026-10-05公式公開条件との数量比較です。送信回数は月の仮置き、追加通数には確認・テスト・再送等を含めてください。実配信、到達、料金確約、紹介承認を証明しません。`};
  }
  root.CreatorFit = {evaluate};
  if (typeof document === 'undefined') return;
  const form = document.getElementById('fit-form');
  if (!form) return;
  const output = document.getElementById('fit-output');
  const save = document.getElementById('fit-save');
  let report = '';
  function update() {
    const input = Object.fromEntries([...fields, 'content', 'permission', 'unsubscribe', 'groups', 'automation', 'selfChange', 'current'].map(k => [k, form.elements[k].value]));
    const result = evaluate(input);
    report = 'メール配信の数量・作業確認\n' + result.text + '\n\n入力（読者の氏名・メールアドレスなし）\n' + Object.entries(input).map(([k,v]) => `${labels[k]}: ${valueLabels[v] || v || '不明'}`).join('\n') + '\n\n原典 https://kit.com/pricing\nhttps://www.mailerlite.com/pricing\n';
    output.textContent = result.text;
    save.disabled = false;
  }
  form.addEventListener('submit', event => {event.preventDefault(); update();});
  form.addEventListener('input', () => { report = ''; save.disabled = true; output.textContent = '条件が変わりました。もう一度「数量と次の確認を出す」を押してください。'; });
  form.addEventListener('reset', () => {report = ''; save.disabled = true; output.textContent = '未判定：自分の集計値を確認してください。';});
  save.addEventListener('click', () => {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([report], {type: 'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url; link.download = 'email-fit-check.txt';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  });
})(globalThis);
