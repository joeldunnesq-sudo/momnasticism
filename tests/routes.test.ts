import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../src/index';
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0001_initial.sql',import.meta.url),'utf8'));db.exec(readFileSync(new URL('../migrations/0002_post_categories.sql',import.meta.url),'utf8'));
 const prepare=(sql:string)=>{let args:unknown[]=[];const statement={bind(...a:unknown[]){args=a;return statement;},async first(){return db.prepare(sql).get(...args as never[])||null;},async all(){return {results:db.prepare(sql).all(...args as never[])};},async run(){const result=db.prepare(sql).run(...args as never[]);return {meta:{changes:Number(result.changes)}};}};return statement;};
 const objects=new Map();
 const env={DB:{prepare,async batch(statements:any[]){db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}},PHOTOS:{async put(key:string,body:any,metadata:any){objects.set(key,{body,...metadata});},async get(key:string){return objects.get(key)||null;}},ASSETS:{fetch:()=>new Response('not found',{status:404})},SITE_URL:'https://example.com',ACCESS_TEAM_DOMAIN:'',ACCESS_AUD:'',ADMIN_EMAILS:'',LOCAL_DEV_AUTH:'true'};
 const request=(path:string,method='GET',data?:unknown,publicRequest=false,headers={})=>worker.fetch(new Request((publicRequest?'https://example.com':'http://localhost:8787')+path,{method,headers:{Origin:publicRequest?'https://example.com':'http://localhost:8787','X-Momnasticism-Request':'1',...headers},body:data===undefined?undefined:JSON.stringify(data)}),env as any);
 return {db,env,request};
}
test('draft → publish → update → conflict → unpublish → delete',async()=>{
 const {request,db}=fixture();
 const created=await request('/api/admin/posts','POST',{title:'Holy Waiting',body:'A **private** entry.',excerpt:'Our first entry',status:'draft'});assert.equal(created.status,201);let p=await created.json() as any;
 assert.equal((await request('/journal/'+p.slug,'GET',undefined,true)).status,404);
 assert.ok(!(await (await request('/feed.xml','GET',undefined,true)).text()).includes('Holy Waiting'));
 assert.ok(!(await (await request('/sitemap.xml','GET',undefined,true)).text()).includes('/journal/'+p.slug));
 assert.equal((await request('/api/admin/posts','GET',undefined,true)).status,401);
 assert.equal((await request('/api/admin/posts','POST',{title:'Intrusion',status:'draft'},false,{Origin:'https://evil.com'})).status,403);
 assert.equal((await request('/api/admin/posts','POST',{title:'Duplicate',slug:p.slug,status:'draft'})).status,409);
 let published=await request('/api/admin/posts/'+p.id,'PUT',{...p,status:'published'});assert.equal(published.status,200);p=await published.json();
 assert.equal((await request('/journal/'+p.slug,'GET',undefined,true)).status,200);
 assert.ok((await (await request('/sitemap.xml','GET',undefined,true)).text()).includes('/journal/'+p.slug));
 assert.ok((await (await request('/feed.xml','GET',undefined,true)).text()).includes('Holy Waiting'));
 const stale={...p};published=await request('/api/admin/posts/'+p.id,'PUT',{...p,body:'Updated'});assert.equal(published.status,200);p=await published.json();
 assert.equal((await request('/api/admin/posts/'+p.id,'PUT',stale)).status,409);
 const history=await (await request('/api/admin/posts/'+p.id+'/versions')).json() as any[];assert.equal(history.length,2);
 assert.equal((await request('/api/admin/posts/'+p.id,'PUT',{...p,status:'draft'})).status,200);
 assert.equal((await request('/journal/'+p.slug,'GET',undefined,true)).status,404);
 assert.equal((await request('/api/admin/posts/'+p.id,'DELETE')).status,200);
 assert.equal((await (await request('/api/admin/posts')).json() as any[]).length,0);db.close();
});
test('uploaded draft photos stay private until referenced by a published entry',async()=>{
 const {request,env,db}=fixture();const bytes=new Uint8Array([137,80,78,71,13,10,26,10]);
 const upload=await worker.fetch(new Request('http://localhost:8787/api/admin/upload',{method:'POST',headers:{Origin:'http://localhost:8787','X-Momnasticism-Request':'1'},body:bytes}),env as any);assert.equal(upload.status,201);const {url}=await upload.json() as any;
 assert.equal((await request(url,'GET',undefined,true)).status,404);assert.equal((await request(url)).status,200);
 let p=await (await request('/api/admin/posts','POST',{title:'A Photo',status:'draft',cover:url})).json() as any;
 p=await (await request('/api/admin/posts/'+p.id,'PUT',{...p,status:'published'})).json();assert.equal((await request(url,'GET',undefined,true)).status,200);
 await request('/api/admin/posts/'+p.id,'PUT',{...p,status:'draft'});assert.equal((await request(url,'GET',undefined,true)).status,404);
 const bad=await worker.fetch(new Request('http://localhost:8787/api/admin/upload',{method:'POST',headers:{Origin:'http://localhost:8787','X-Momnasticism-Request':'1'},body:'<svg onload="alert(1)"/>'}),env as any);assert.equal(bad.status,400);db.close();
});

test('recipe category persists, filters the journal, and uses the recipe layout',async()=>{
 const {request}=fixture();
 const response=await request('/api/admin/posts','POST',{title:'Family bread',body:'## Ingredients\n\n- Flour\n\n## Instructions\n\n1. Mix.',status:'published',category:'Recipes',post_type:'recipe'});
 assert.equal(response.status,201);const post=await response.json() as any;assert.equal(post.category,'Recipes');assert.equal(post.post_type,'recipe');
 assert.match(await (await request('/journal?category=Recipes','GET',undefined,true)).text(),/Family bread/);
 assert.doesNotMatch(await (await request('/journal?category=Motherhood','GET',undefined,true)).text(),/Family bread/);
 assert.match(await (await request('/journal/'+post.slug,'GET',undefined,true)).text(),/entry-recipe/);
 assert.equal((await request('/api/admin/posts','POST',{title:'Invalid',status:'draft',category:'Unknown'})).status,400);
});
