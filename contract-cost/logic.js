/* Same-period fee comparison. Unknown charges never become confirmed zero. */
(function (root) {
  'use strict';
  const tiers = [[7000,42000,3500],[10000,60000,5000],[20000,120000,10000],[30000,180000,15000],[40000,240000,20000],[50000,300000,25000],[70000,420000,35000],[100000,600000,50000]];
  function count(value, label, max) {
    const s = String(value ?? '').trim();
    if (!/^[1-9]\d*$/.test(s) || !Number.isSafeInteger(Number(s)) || Number(s) > max) throw Error(label + 'を範囲内の正の整数で入力してください。');
    return Number(s);
  }
  function money(value, label) {
    const s = String(value ?? '').trim();
    if (s === '') return null;
    if (!/^(?:0|[1-9]\d*)$/.test(s) || !Number.isSafeInteger(Number(s)) || Number(s) > 100000000) throw Error(label + 'は確認した0〜100,000,000円の整数で入力してください。不明なら空欄にします。');
    return Number(s);
  }
  function quote(input) {
    const contacts = count(input.contacts, '登録数', 1000000);
    const messages = count(input.messages, '通数', 10000000);
    const term = Number(input.term);
    if (![3,6,12].includes(term)) throw Error('契約期間を3・6・12か月から選んでください。');
    const tier = tiers.find(row => contacts <= row[0] && messages <= row[1]);
    if (!tier) return null;
    const setup = money(input.setup, '初期費用');
    const additional = money(input.additional, '期間全体の追加費用');
    const monthlyNet = tier[2] * term;
    const unknown = [setup === null ? '初期費用' : '', additional === null ? '追加費用' : ''].filter(Boolean);
    const net = unknown.length ? null : monthlyNet + setup + additional;
    return {tier,term,setup,additional,monthlyNet,unknown,net,tax:net === null ? null : Math.round(net * 0.1),total:net === null ? null : Math.round(net * 1.1)};
  }
  function assess(q, input) {
    const budget = money(input.budget, '予算');
    const reasons = [];
    if (!q) reasons.push('表示枠を超えるため個別料金の確認が必要です。');
    if (q && q.unknown.length) reasons.push(q.unknown.join('・') + 'が未確認のため、総額は未確定です。');
    if (budget === null) reasons.push('期間全体の税込予算は未確認です。');
    else if (q && q.total !== null && budget < q.total) reasons.push('この計算例は入力予算を超えています。');
    if (!input.priceChecked) reasons.push('この人数・通数・契約期間に適用される月額、初期費用、追加費用を申込先で確認してください。');
    if (!input.need) reasons.push('今の無料運用で残る作業と、日本語の電話支援が必要かを確認してください。');
    if (!input.handoff) reasons.push('配信許可と解除済みの除外を引き継げるか確認してください。');
    return {budget,eligible:reasons.length === 0,reasons};
  }
  const api = {quote,assess,money};
  root.ContractCost = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
