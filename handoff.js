(function(root){
const integer=v=>Number.isSafeInteger(v)&&v>=0&&v<=100000000;
function validate(d,stage){if(!d||d.v!==1||d.stage!==stage)return null;if(stage==='audience'){if(!integer(d.contacts)||!integer(d.people)||d.people>d.contacts)return null;return {v:1,stage,contacts:d.contacts,people:d.people};}if(stage==='plan'){if(!integer(d.contacts)||!integer(d.messages)||d.contacts===0||d.messages===0)return null;return {v:1,stage,contacts:d.contacts,messages:d.messages};}return null;}
function encode(d){const value=validate(d,d.stage);if(!value)throw Error('Invalid aggregate handoff');return '#counts='+encodeURIComponent(JSON.stringify(value));}
function consume(stage){const hash=location.hash;if(!hash.startsWith('#counts='))return null;history.replaceState(null,'',location.pathname+location.search);try{if(hash.length>600)return null;return validate(JSON.parse(decodeURIComponent(hash.slice(8))),stage);}catch{return null;}}
root.AggregateHandoff={validate,encode,consume};if(typeof module!=='undefined')module.exports={validate,encode};
})(typeof window==='undefined'?globalThis:window);
