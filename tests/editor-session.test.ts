import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {admin} from '../src/views';

const settle=()=>new Promise(resolve=>setTimeout(resolve,30));
for(const failure of ['access-redirect','unauthorized','network']){
 test(`publishing after ${failure} retains writing and permits an explicit retry`,async()=>{
  const dom=new JSDOM(admin(),{url:'https://momnasticism.com/admin',runScripts:'outside-only'});
  const win=dom.window;win.confirm=()=>true;
  const post={id:'abc',title:'A little rule of prayer',slug:'a-little-rule-of-prayer',body:'Original sample.',status:'published',revision:1,category:'Faith & Prayer',post_type:'reflection'};
  let rejectSave=true;const attempts:any[]=[];
  win.fetch=async(url:string,options:any={})=>{
   if(options.method==='PUT'){
    attempts.push(options);
    if(rejectSave){
     if(failure==='network')throw new TypeError('Failed to fetch');
     return {type:failure==='access-redirect'?'opaqueredirect':'basic',status:failure==='unauthorized'?401:0,ok:false,json:async()=>{throw Error('Must not parse an Access redirect');}};
    }
    return {ok:true,status:200,json:async()=>({...post,...JSON.parse(options.body),revision:2})};
   }
   return {ok:true,status:200,json:async()=>url.endsWith('/versions')?[]:[post]};
  };
  win.eval(readFileSync(new URL('../public/admin.js',import.meta.url),'utf8'));await settle();
  const get=(id:string)=>win.document.getElementById(id) as any;
  get('posts').querySelector('button').click();
  get('body').value='Stephanie’s revised reflection.\n\nKeep every word.';
  get('body').dispatchEvent(new win.Event('input',{bubbles:true}));
  get('publish').click();await settle();
  assert.equal(attempts.length,1,'a failed write must not automatically be retried');
  assert.equal(attempts[0].redirect,'manual');assert.equal(attempts[0].credentials,'same-origin');
  assert.equal(get('publish').disabled,false);assert.equal(get('connection-help').hidden,false);
  assert.doesNotMatch(get('save-status').textContent,/Failed to fetch/);
  if(failure!=='network')assert.match(get('save-status').textContent,/sign-in has expired/);
  const recovered=JSON.parse(win.localStorage.getItem('momnasticism-draft-abc')!);
  assert.equal(recovered.body,get('body').value);
  const link=get('connection-help').querySelector('a');assert.equal(link.href,'https://momnasticism.com/admin');assert.equal(link.target,'_blank');
  rejectSave=false;get('publish').click();await settle();
  assert.equal(attempts.length,2);assert.equal(JSON.parse(attempts[1].body).body,recovered.body);
  assert.match(get('save-status').textContent,/Published/);assert.equal(get('connection-help').hidden,true);
  assert.equal(win.localStorage.getItem('momnasticism-draft-abc'),null);
  dom.window.close();
 });
}
