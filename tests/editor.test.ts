import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {admin} from '../src/views';
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
test('editor autosaves a draft but requires explicit publishing for live edits',async()=>{
 const dom=new JSDOM(admin(),{url:'http://localhost:8787/admin',runScripts:'outside-only'});
 const win=dom.window;const writes:any[]=[];let post:any=null;
 win.confirm=()=>true;win.HTMLElement.prototype.scrollIntoView=()=>{};
 win.fetch=async(url:string,options:any={})=>{
  if(url.endsWith('/versions'))return {ok:true,status:200,json:async()=>[]};
  if(url.endsWith('/preview'))return {ok:true,status:200,json:async()=>({html:'<p>Preview</p>'})};
  if(options.method==='POST'||options.method==='PUT'){const data=JSON.parse(options.body);writes.push(data);post={...data,id:'abc',revision:(post?.revision||0)+1};return {ok:true,status:200,json:async()=>post};}
  return {ok:true,status:200,json:async()=>post?[post]:[]};
 };
 win.eval(readFileSync(new URL('../public/admin.js',import.meta.url),'utf8'));await wait(20);
 const get=(id:string)=>win.document.getElementById(id) as any;
 get('new').click();get('title').value='Waiting with hope';get('body').value='A private draft.';get('body').dispatchEvent(new win.Event('input',{bubbles:true}));await wait(1650);
 assert.equal(writes.length,1);assert.equal(writes[0].status,'draft');assert.match(get('save-status').textContent,/Draft saved/);
 get('publish').click();await wait(30);assert.equal(writes.length,2);assert.equal(writes[1].status,'published');
 get('body').value='A change not yet public.';get('body').dispatchEvent(new win.Event('input',{bubbles:true}));await wait(1650);assert.equal(writes.length,2);
 get('preview').click();await wait(30);assert.equal(get('preview-content').hidden,false);assert.equal(writes.length,2);
 get('publish').click();await wait(30);assert.equal(writes.length,3);assert.equal(writes[2].body,'A change not yet public.');
 dom.window.close();
});
