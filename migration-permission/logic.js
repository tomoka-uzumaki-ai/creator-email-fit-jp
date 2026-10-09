(function(root){'use strict';
const MAX_BYTES=1048576,MAX_ROWS=500,HEADER=['alias','permission','withdrawn','topics'],BATCH=['campaign','batch','alias','topic','permission','withdrawn','topics'];
const fail=m=>{throw Error(m);}, id=(v,prefix)=>new RegExp('^'+prefix+'[0-9]{3,5}$').test(v);
function parseCSV(text){if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)fail('CSVは1 MiB以内にしてください。');text=text.replace(/^\uFEFF/,'');let rows=[],row=[],cell='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}else if(c==='"'){if(cell||closed)fail('CSVの引用符が不正です。');quoted=true;}else if(c===','||c==='\n'||c==='\r'){row.push(cell);cell='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;rows.push(row);row=[];if(rows.length>MAX_ROWS+1)fail('最大500行です。');}}else{if(closed)fail('閉じた引用符の後に文字があります。');cell+=c;}}
 if(quoted)fail('CSVの引用符が閉じていません。');if(cell!==''||row.length||closed){row.push(cell);rows.push(row);}if(!rows.length)fail('CSVを入力してください。');return rows;
}
function records(text,batch=false){let rows=parseCSV(text),head=batch?BATCH:HEADER;if(JSON.stringify(rows[0])!==JSON.stringify(head))fail('指定の列名・順序を使用してください：'+head.join(','));if(rows.length<2||rows.length>MAX_ROWS+1)fail('1〜500データ行を使ってください。');const keys=new Set(),aliases=new Map();
 return rows.slice(1).map((cells,i)=>{const line=i+2;if(cells.length!==head.length)fail(line+'行目：列数が違います。');let r=Object.fromEntries(head.map((h,j)=>[h,cells[j].trim()]));if(!id(r.alias,'p'))fail(line+'行目：架空IDはp001形式（3〜5桁）です。');for(const k of ['permission','withdrawn'])if(!['yes','no','unknown'].includes(r[k]))fail(line+'行目：'+k+'はyes/no/unknownです。');if(!['story','notes','story|notes','none','unknown'].includes(r.topics))fail(line+'行目：topicsが不正です。');let key=r.alias;
 if(batch){if(!id(r.campaign,'c')||!id(r.batch,'b')||!['story','notes'].includes(r.topic))fail(line+'行目：campaign/batch/topicが不正です。');key=[r.campaign,r.batch,r.alias,r.topic].join(':');const signature=[r.permission,r.withdrawn,r.topics].join(':');if(aliases.has(r.alias)&&aliases.get(r.alias)!==signature)fail(line+'行目：同じ架空IDの状態が一致しません。');aliases.set(r.alias,signature);}
 if(keys.has(key))fail(line+'行目：重複行・IDがあります。');keys.add(key);return r;});
}
function classify(r,topic){if(!['story','notes'].includes(topic))fail('確認する話題を選んでください。');let reasons=[];
 if(r.withdrawn==='yes')return {classification:'stop',reasons:['withdrawn']};if(r.permission==='no')return {classification:'stop',reasons:['permission_no']};
 if(r.permission==='unknown')reasons.push('permission_unknown');if(r.withdrawn==='unknown')reasons.push('withdrawn_unknown');if(r.topics==='unknown')reasons.push('topics_unknown');if(reasons.length)return {classification:'unknown',reasons};
 if(!r.topics.split('|').includes(topic))return {classification:'stop',reasons:['topic_not_requested']};return {classification:'declared_candidate',reasons:['owner_declared_only']};
}
function permission(rows,topic){const result=rows.map(r=>({...r,topic,...classify(r,topic)}));return {job:'permission',topic,rows:result,summary:count(result),limits:'本人が記入した架空状態の分類です。実際の同意・法令・配信可否を認定せず、送信しません。停止・未確認は候補に加えません。'};}
function count(rows){return {declared_candidate:rows.filter(r=>r.classification==='declared_candidate').length,stop:rows.filter(r=>r.classification==='stop').length,unknown:rows.filter(r=>r.classification==='unknown').length};}
function migration(before,after,topic){let a=new Map(before.map(r=>[r.alias,r])),b=new Map(after.map(r=>[r.alias,r]));const rows=[...new Set([...a.keys(),...b.keys()])].sort().map(alias=>{let old=a.get(alias),next=b.get(alias),flags=[],classification='stop';
 if(!old)flags.push('added_alias_review');if(!next)flags.push('missing_after');
 if(old&&next){if(old.withdrawn==='yes'&&next.withdrawn!=='yes')flags.push('withdrawal_lost_hold');if(old.permission!==next.permission)flags.push('permission_changed_review');if(old.topics!==next.topics)flags.push('topics_changed_review');}
 if(next)classification=classify(next,topic).classification;if(old&&old.withdrawn==='yes')classification='stop';
 if(classification==='declared_candidate'&&flags.length)classification='unknown';return {alias,before:old||null,after:next||null,classification,flags,reasons:next?classify(next,topic).reasons:['missing_after']};});
 return {job:'migration',topic,rows,summary:count(rows),limits:'停止済みの旧状態を再開へ変換しません。追加・状態/話題変更は本人の再確認が必要です。実サービスの移行や配信は行いません。'};
}
function batches(input){let grouped=new Map(),rows=input.map(r=>({...r,...classify(r,r.topic),overlap:[],flags:[]}));rows.forEach((r,i)=>{if(r.classification!=='declared_candidate')return;const k=r.campaign+':'+r.alias;if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(i);});
 for(const indexes of grouped.values())if(indexes.length>1)indexes.forEach(i=>{rows[i].flags.push('repeated_in_same_campaign');rows[i].overlap=indexes.filter(j=>j!==i).map(j=>rows[j].batch+':'+rows[j].topic);});
 const totals=count(rows);return {job:'batches',rows,summary:{declared_candidate_rows:totals.declared_candidate,stop_rows:totals.stop,unknown_rows:totals.unknown,repeated_candidate_rows:rows.filter(r=>r.overlap.length).length,repeated_campaign_alias_groups:[...grouped.values()].filter(g=>g.length>1).length},limits:'件数は計画行の数で、実読者人数ではありません。同じcampaign内の候補重複を示します。別話題を別メールにする意図もあり得るため自動削除しません。停止・未確認は重複候補数へ含めず、実送信・配信予約は行いません。'};
}
function csv(report){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';if(report.job==='migration'){const header=['alias','before_permission','after_permission','before_withdrawn','after_withdrawn','before_topics','after_topics','classification','flags'];return [header.join(','),...report.rows.map(r=>[r.alias,r.before?.permission||'missing_record',r.after?.permission||'missing_record',r.before?.withdrawn||'missing_record',r.after?.withdrawn||'missing_record',r.before?.topics||'missing_record',r.after?.topics||'missing_record',r.classification,r.flags.join('|')].map(q).join(','))].join('\r\n');}
 const header=report.job==='batches'?['campaign','batch','alias','topic','classification','reasons','overlap']:['alias','topic','classification','reasons'];return [header.join(','),...report.rows.map(r=>header.map(k=>q(Array.isArray(r[k])?r[k].join('|'):r[k])).join(','))].join('\r\n');}
function txt(report){return '架空IDの確認結果 / '+report.job+'\n'+report.limits+'\n\n'+JSON.stringify(report.summary,null,2)+'\n\n'+csv(report);}
const api={parseCSV,records,classify,permission,migration,batches,csv,txt,MAX_BYTES};root.AliasChecks=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
