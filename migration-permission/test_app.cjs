'use strict';const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),A=require('./logic.js');
class El{constructor(value=''){this.value=value;this.events={};this.hidden=false;this.disabled=false;this.checked=false;this.files=[];this.textContent='';}addEventListener(n,f){this.events[n]=f;}querySelectorAll(){return this.buttons||[];}async fire(n='click'){return this.events[n]({preventDefault(){}});}}
function page(kind){let ids=['input','before','after','file','before-file','after-file','topic','synthetic','need','help','form','sample','result','error','report','csv-save','txt-save','confirm'];let e=Object.fromEntries(ids.map(id=>[id,new El()]));e.topic.value='story';e.form.buttons=[e.confirm];let blobs=[];vm.runInNewContext(fs.readFileSync(__dirname+'/app.js','utf8'),{AliasChecks:A,Blob,URL:{createObjectURL:b=>{blobs.push(b);return 'blob:test';},revokeObjectURL(){}},setTimeout:fn=>fn(),document:{body:{dataset:{job:kind}},getElementById:id=>e[id],createElement:()=>({click(){}})}});return {e,blobs};}
(async()=>{let checks=0;for(const kind of ['permission','migration','batches']){let {e,blobs}=page(kind);await e.sample.fire();await e.form.fire('submit');assert.equal(e.result.hidden,false);assert.equal(e['csv-save'].disabled,false);await e['csv-save'].fire();assert.ok((await blobs.at(-1).text()).includes('alias'));await e['txt-save'].fire();assert.ok((await blobs.at(-1).text()).includes('仮ID'));checks+=3;
 let field=kind==='migration'?e.after:e.input;field.value='broken';await field.fire('input');assert.equal(e.result.hidden,true);assert.equal(e['csv-save'].disabled,true);await e.form.fire('submit');assert.equal(e.result.hidden,true);checks+=2;
 await e.sample.fire();e.synthetic.checked=false;await e.form.fire('submit');assert.equal(e['csv-save'].disabled,true);checks++;
 await e.sample.fire();await e.form.fire('submit');assert.equal(e.help.hidden,true);e.need.checked=true;await e.need.fire('change');assert.equal(e.help.hidden,false);checks++;
 let file=kind==='migration'?e['after-file']:e.file;file.files=[{size:4,text:async()=> 'oops'}];await file.fire('change');assert.equal(e.result.hidden,true);assert.equal(e['txt-save'].disabled,true);checks++;
 let resolve;const valid=kind==='migration'?e.after.value:e.input.value;file.files=[{size:valid.length,text:()=>new Promise(r=>resolve=r)}];let importing=file.fire('change');field.value='new-edit';await field.fire('input');resolve(valid);await importing;assert.equal(field.value,'new-edit');checks++;
 }
 // Submit during a pending import used to produce an old report that survived new input.
 for(const kind of ['permission','migration','batches']){
  const {e,blobs}=page(kind);await e.sample.fire();await e.form.fire('submit');
  const field=kind==='migration'?e.after:e.input,file=kind==='migration'?e['after-file']:e.file;
  const incoming=field.value.replace(/p001/g,'p099');let resolve;
  file.files=[{size:incoming.length,text:()=>new Promise(r=>resolve=r)}];const loading=file.fire('change');
  assert.equal(e.confirm.disabled,true);assert.equal(e.result.hidden,true);
  await e.form.fire('submit');assert.equal(e.result.hidden,true);assert.ok(e.error.textContent.includes('読込み中'));
  await e['csv-save'].fire();assert.equal(blobs.length,0);
  resolve(incoming);await loading;assert.equal(field.value,incoming);assert.equal(e.confirm.disabled,false);assert.equal(e.result.hidden,true);assert.equal(e['csv-save'].disabled,true);
  await e.form.fire('submit');await e['csv-save'].fire();assert.ok((await blobs.at(-1).text()).includes('p099'));checks++;
 }
 // Before and after imports have independent revisions and neither cancels the other.
 {
  const {e}=page('migration');await e.sample.fire();const h='alias,permission,withdrawn,topics\n';
  const before=h+'p010,yes,no,story',after=h+'p010,yes,no,story';let rb,ra;
  e['before-file'].files=[{size:before.length,text:()=>new Promise(r=>rb=r)}];e['after-file'].files=[{size:after.length,text:()=>new Promise(r=>ra=r)}];
  const pb=e['before-file'].fire('change'),pa=e['after-file'].fire('change');rb(before);await pb;assert.equal(e.before.value,before);assert.equal(e.confirm.disabled,true);ra(after);await pa;
  assert.equal(e.after.value,after);assert.equal(e.before.value,before);assert.equal(e.confirm.disabled,false);await e.form.fire('submit');assert.equal(e.result.hidden,false);assert.ok(e.report.textContent.includes('declared_candidate'));checks++;
 }
 // A manual change cancels only its own field; the independent after import still commits.
 {
  const {e}=page('migration');await e.sample.fire();const h='alias,permission,withdrawn,topics\n',incoming=h+'p020,yes,no,story',manual=h+'p030,yes,no,story';let rb,ra;
  e['before-file'].files=[{size:incoming.length,text:()=>new Promise(r=>rb=r)}];e['after-file'].files=[{size:manual.length,text:()=>new Promise(r=>ra=r)}];const pb=e['before-file'].fire('change'),pa=e['after-file'].fire('change');
  e.before.value=manual;await e.before.fire('input');ra(manual);await pa;assert.equal(e.after.value,manual);assert.equal(e.confirm.disabled,true);rb(incoming);await pb;
  assert.equal(e.before.value,manual);assert.equal(e.after.value,manual);assert.equal(e.confirm.disabled,false);checks++;
 }
 // Loading a sample while both imports await never lets later reads replace it.
 {
  const {e}=page('migration');await e.sample.fire();const h='alias,permission,withdrawn,topics\n',incoming=h+'p099,yes,no,story';let rb,ra;
  e['before-file'].files=[{size:incoming.length,text:()=>new Promise(r=>rb=r)}];e['after-file'].files=[{size:incoming.length,text:()=>new Promise(r=>ra=r)}];const pb=e['before-file'].fire('change'),pa=e['after-file'].fire('change');await e.sample.fire();const sb=e.before.value,sa=e.after.value;
  rb(incoming);ra(incoming);await Promise.all([pb,pa]);assert.equal(e.before.value,sb);assert.equal(e.after.value,sa);assert.equal(e.confirm.disabled,false);assert.equal(e.result.hidden,true);checks++;
 }
 // Two reads of the same field cannot restore the older selection when it finishes last.
 {
  const {e}=page('permission');await e.sample.fire();const h='alias,permission,withdrawn,topics\n',old=h+'p040,yes,no,story',latest=h+'p050,yes,no,story';let ro,rn;
  e.file.files=[{size:old.length,text:()=>new Promise(r=>ro=r)}];const po=e.file.fire('change');e.file.files=[{size:latest.length,text:()=>new Promise(r=>rn=r)}];const pn=e.file.fire('change');rn(latest);await pn;assert.equal(e.input.value,latest);assert.equal(e.confirm.disabled,true);ro(old);await po;assert.equal(e.input.value,latest);assert.equal(e.confirm.disabled,false);checks++;
 }
 console.log(JSON.stringify({checks,status:'passed',route:'Three DOM event harnesses; actual CSV/TXT Blob reads; visual browser QA remains parent'}));})().catch(e=>{console.error(e);process.exitCode=1;});
