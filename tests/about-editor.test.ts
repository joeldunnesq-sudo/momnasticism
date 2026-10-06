import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {admin} from '../src/views';
import {aboutDefaults} from '../src/pages';
const settle=()=>new Promise(resolve=>setTimeout(resolve,40));

test('About editor keeps changes local, retains failed saves, retries, and uploads photos',async()=>{
 const dom=new JSDOM(admin(),{url:'http://localhost:8787/admin',runScripts:'outside-only'});const win=dom.window;win.confirm=()=>true;
 let revision=0,failSave=true;const writes:any[]=[];
 win.fetch=async(url:string,options:any={})=>{
  if(url.endsWith('/upload'))return {ok:true,status:201,json:async()=>({url:'/media/abc.png'})};
  if(url.endsWith('/pages/about')){
   if(options.method==='PUT'){writes.push(JSON.parse(options.body));if(failSave)return {ok:false,status:409,json:async()=>({error:'This page changed in another tab.'})};return {ok:true,status:200,json:async()=>({content:JSON.parse(options.body).content,revision:++revision})};}
   return {ok:true,status:200,json:async()=>({content:aboutDefaults,revision})};
  }
  return {ok:true,status:200,json:async()=>[]};
 };
 win.eval(readFileSync(new URL('../public/admin.js',import.meta.url),'utf8'));
 const get=(id:string)=>win.document.getElementById(id) as any;
 const panel=get('about-editor').closest('details');panel.open=true;await settle();
 assert.equal(get('about-intro').value,aboutDefaults.intro);assert.equal(get('about-portrait-preview').getAttribute('src'),aboutDefaults.portrait);
 get('about-intro').value='Revised biography';get('about-intro').dispatchEvent(new win.Event('input',{bubbles:true}));await settle();assert.equal(writes.length,0);
 assert.equal(JSON.parse(win.localStorage.getItem('momnasticism-about-recovery')!).content.intro,'Revised biography');
 get('about-save').click();await settle();assert.equal(writes.length,1);assert.match(get('about-status').textContent,/another tab/);assert.equal(get('about-save').disabled,false);assert.ok(win.localStorage.getItem('momnasticism-about-recovery'));
 failSave=false;get('about-save').click();await settle();assert.equal(writes[1].content.intro,'Revised biography');assert.equal(win.localStorage.getItem('momnasticism-about-recovery'),null);assert.match(get('about-status').textContent,/changes are live/);
 const input=get('about-family-upload');Object.defineProperty(input,'files',{value:[new win.File(['image'],'family.png',{type:'image/png'})]});input.dispatchEvent(new win.Event('change'));await settle();assert.equal(get('about-family').value,'/media/abc.png');assert.equal(writes.length,2);
 get('about-save').click();await settle();assert.equal(writes[2].content.family,'/media/abc.png');assert.equal(writes[2].revision,1);
 get('about-editor').querySelector('[data-remove-photo="portrait"]').click();assert.equal(get('about-portrait-preview').hidden,true);assert.equal(get('about-portrait').value,'');
 dom.window.close();
});
