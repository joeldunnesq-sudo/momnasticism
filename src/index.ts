import {aboutDefaults,aboutFields,AboutContent,loadAbout} from './pages';
import {authorized,sameOrigin,AuthEnv} from './auth';
import {Post,categories,escape as e,slugify,markdown} from './content';
import {home,journal,article,about,admin,shell,shop} from './views';
interface Env extends AuthEnv {DB:D1Database;PHOTOS:R2Bucket;ASSETS:Fetcher;SITE_URL:string}
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const html=(data:string,status=200)=>new Response(data,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
const publicPosts=async(env:Env)=>(await env.DB.prepare("SELECT * FROM posts WHERE status='published' ORDER BY published_at DESC").all<Post>()).results;
function fail(message:string,status=400):never{throw Object.assign(new Error(message),{status});}
export default {async fetch(req:Request,env:Env):Promise<Response>{let response:Response;try{response=await route(req,env);}catch(error){const err=error as Error&{status?:number};if(!err.status)console.error('Request failed',err);response=json({error:err.status?err.message:'Something went wrong. Please try again.'},err.status||500);}const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');headers.set('X-Frame-Options','DENY');headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' https://assets.mailerlite.com; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: http://localhost:* blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://assets.mailerlite.com; object-src 'none'");if(req.url.includes('/admin'))headers.set('X-Robots-Tag','noindex, nofollow');return new Response(req.method==='HEAD'?null:response.body,{status:response.status,headers});}};
async function route(req:Request,env:Env):Promise<Response>{
 const url=new URL(req.url),path=url.pathname;
 if(url.hostname==='www.momnasticism.com'){url.hostname='momnasticism.com';url.protocol='https:';return Response.redirect(url.href,308);}
 if(path!=='/'&&path.endsWith('/')){url.pathname=path.replace(/\/+$/,'');return Response.redirect(url.href,308);}
 const protectedRoute=path==='/admin'||path.startsWith('/admin/')||path.startsWith('/api/admin/');
 if(protectedRoute){if(!await authorized(req,env))return path.startsWith('/api/')?json({error:'Admin sign-in required.'},401):html(shell('Admin sign-in','<section class="entry"><h1>Writer’s desk</h1><p>Admin access is protected by Cloudflare Access. Configure the email allowlist and application settings described in the README before signing in.</p><a href="/">Return home</a></section>'),401);if(!['GET','HEAD'].includes(req.method)&&!sameOrigin(req))return json({error:'Request origin rejected.'},403);}
 if(path==='/subscribe/check-email'&&req.method==='GET')return html(shell('Check your email','<section class="entry"><div class="eyebrow">Letters from the little cloister</div><h1>A little letter is on its way.</h1><p>Check your inbox for a confirmation email and follow its link to join Momnasticism. If you have already subscribed, you’re all set.</p><p>If you don’t see it, check your spam folder.</p><a class="button" href="/journal">Explore the journal →</a></section>',false,{noindex:true}));
 if(req.method==='GET'&&path==='/admin')return html(admin());
 if(path==='/api/admin/pages/about'&&req.method==='GET')return json(await loadAbout(env.DB));
 if(path==='/api/admin/pages/about'&&req.method==='PUT'){
  const data=await req.json() as {content?:AboutContent;revision?:number};
  if(!data.content||typeof data.content!=='object'||!Number.isInteger(data.revision)||data.revision!<0)fail('Valid page content and revision required.');
  const content={...aboutDefaults};
  for(const f of aboutFields){const value=data.content[f.key];if(typeof value!=='string'||value.length>(f.kind==='markdown'?20000:2000))fail('Invalid '+f.label+'.');
   if(f.kind==='photo'&&value!==''&&value!==aboutDefaults[f.key]&&!/^\/media\/[a-f0-9-]+\.(jpg|png|webp|gif)$/.test(value))fail('Upload photos using this editor.');
   if(f.kind==='url'&&value&&!/^https:\/\/[^\s]+$/.test(value))fail('Use an HTTPS quote source URL.');
   content[f.key]=value;
  }
  const now=new Date().toISOString();
  const result=data.revision===0
   ?await env.DB.prepare("INSERT INTO pages(id,content,revision,updated_at) VALUES('about',?,1,?) ON CONFLICT(id) DO NOTHING").bind(JSON.stringify(content),now).run()
   :await env.DB.prepare("UPDATE pages SET content=?,revision=revision+1,updated_at=? WHERE id='about' AND revision=?").bind(JSON.stringify(content),now,data.revision).run();
  if(!result.meta.changes)fail('This page changed in another tab. Reload before saving.',409);
  return json({content,revision:data.revision!+1});
 }
 if(path==='/api/admin/posts'&&req.method==='GET')return json((await env.DB.prepare('SELECT * FROM posts ORDER BY updated_at DESC').all<Post>()).results);
 if(path==='/api/admin/export'&&req.method==='GET'){const data={version:2,pages:(await env.DB.prepare('SELECT * FROM pages').all()).results,exported_at:new Date().toISOString(),posts:(await env.DB.prepare('SELECT * FROM posts').all()).results,revisions:(await env.DB.prepare('SELECT * FROM revisions').all()).results,media:(await env.DB.prepare('SELECT * FROM media').all()).results};const res=json(data);res.headers.set('Content-Disposition','attachment; filename="momnasticism-backup.json"');return res;}
 if(path==='/api/admin/preview'&&req.method==='POST'){const data=await req.json() as {body?:unknown};return json({html:markdown(String(data.body||'').slice(0,100000))});}
 if(path==='/api/admin/upload'&&req.method==='POST'){
  const length=Number(req.headers.get('Content-Length'));if(length>10*1024*1024)fail('Photo must be smaller than 10 MB.',413);
  const buf=await req.arrayBuffer();if(buf.byteLength>10*1024*1024)fail('Photo must be smaller than 10 MB.',413);
  const b=new Uint8Array(buf);let ext='',type='';
  if(b[0]===255&&b[1]===216&&b[2]===255){ext='jpg';type='image/jpeg';}else if(b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71){ext='png';type='image/png';}else if(new TextDecoder().decode(b.slice(0,6)).startsWith('GIF8')){ext='gif';type='image/gif';}else if(new TextDecoder().decode(b.slice(0,4))==='RIFF'&&new TextDecoder().decode(b.slice(8,12))==='WEBP'){ext='webp';type='image/webp';}else fail('Use a JPEG, PNG, WebP, or GIF photo.');
  const key=`${crypto.randomUUID()}.${ext}`;await env.PHOTOS.put(key,buf,{httpMetadata:{contentType:type}});await env.DB.prepare('INSERT INTO media VALUES (?,?,?)').bind(key,type,new Date().toISOString()).run();return json({url:`/media/${key}`},201);
 }
 if(path.startsWith('/media/')&&req.method==='GET'){
  const key=path.slice(7);if(!/^[a-f0-9-]+\.(jpg|png|gif|webp)$/.test(key))fail('Not found.',404);
  const referenced=await env.DB.prepare("SELECT id FROM posts WHERE status='published' AND (cover=? OR instr(body,?)>0) LIMIT 1").bind(path,path).first();
  const page=await loadAbout(env.DB);const pagePhoto=aboutFields.some(f=>f.kind==='photo'&&page.content[f.key]===path);
  if(!referenced&&!pagePhoto&&!await authorized(req,env))fail('Not found.',404);
  const object=await env.PHOTOS.get(key);if(!object)fail('Not found.',404);return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'private, no-store'}});
 }
 const versions=path.match(/^\/api\/admin\/posts\/([a-f0-9-]+)\/versions$/);
 if(versions&&req.method==='GET')return json((await env.DB.prepare('SELECT * FROM revisions WHERE post_id=? ORDER BY id DESC LIMIT 30').bind(versions[1]).all()).results);
 const postPath=path.match(/^\/api\/admin\/posts(?:\/([a-f0-9-]+))?$/);
 if(postPath&&['POST','PUT','DELETE'].includes(req.method)){
  if(req.method==='POST'&&postPath[1])fail('Use the new-entry endpoint.');if(req.method!=='POST'&&!postPath[1])fail('Entry ID required.');
  const id=postPath[1]||crypto.randomUUID();const old=await env.DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first<Post>();
  if(req.method!=='POST'&&!old)fail('Entry not found.',404);
  if(req.method==='DELETE'){await env.DB.batch([env.DB.prepare('DELETE FROM revisions WHERE post_id=?').bind(id),env.DB.prepare('DELETE FROM posts WHERE id=?').bind(id)]);return json({ok:true});}
  const data=await req.json() as Partial<Post>;
  for(const field of ['title','slug','excerpt','body','cover','cover_alt'] as const)if(data[field]!==undefined&&typeof data[field]!=='string')fail(`Invalid ${field}.`);
  if(!data.title?.trim()||data.title.length>200)fail('Enter a title of 200 characters or fewer.');
  if(data.status!=='draft'&&data.status!=='published')fail('Invalid entry status.');
  const slug=slugify(data.slug||data.title);if(!slug)fail('Enter a web address using letters or numbers.');
  if((data.body||'').length>100000||(data.excerpt||'').length>1000||(data.cover_alt||'').length>500)fail('Entry is too long.');
  if(data.cover&&!['/sample-covers/an-unexpected-cloister.jpg','/sample-covers/a-little-rule-of-prayer.jpg','/sample-covers/waiting-with-hope.jpg','/sample-covers/our-domestic-church.jpg'].includes(data.cover)&&!/^\/media\/[a-f0-9-]+\.(jpg|png|webp|gif)$/.test(data.cover))fail('Upload a cover photo using the editor.');
  const duplicate=await env.DB.prepare('SELECT id FROM posts WHERE slug=? AND id<>?').bind(slug,id).first();if(duplicate)fail('That web address is already in use.',409);
  if(old&&data.revision!==old.revision)fail('This entry changed in another tab. Reload before saving.',409);
  const category=data.category??old?.category??'Motherhood';const post_type=data.post_type??old?.post_type??'reflection';if(!categories.includes(category as typeof categories[number]))fail('Choose a journal category.');if(!['reflection','recipe','guide','photo-essay','poetry'].includes(post_type))fail('Choose a valid entry style.');
  const now=new Date().toISOString();const p:Post={category,post_type,id,slug,title:data.title.trim(),excerpt:data.excerpt||'',body:data.body||'',cover:data.cover||'',cover_alt:data.cover_alt||'',status:data.status,created_at:old?.created_at||now,updated_at:now,published_at:data.status==='published'?(old?.published_at||now):null,revision:(old?.revision||0)+1};
  const writes:D1PreparedStatement[]=[];if(old)writes.push(env.DB.prepare('INSERT INTO revisions(post_id,snapshot,created_at) VALUES(?,?,?)').bind(id,JSON.stringify(old),now));
  if(old)writes.push(env.DB.prepare('UPDATE posts SET slug=?,title=?,excerpt=?,body=?,cover=?,cover_alt=?,status=?,updated_at=?,published_at=?,revision=?,category=?,post_type=? WHERE id=? AND revision=?').bind(p.slug,p.title,p.excerpt,p.body,p.cover,p.cover_alt,p.status,p.updated_at,p.published_at,p.revision,p.category,p.post_type,id,old.revision));
  else writes.push(env.DB.prepare('INSERT INTO posts(id,slug,title,excerpt,body,cover,cover_alt,status,created_at,updated_at,published_at,revision,category,post_type) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(p.id,p.slug,p.title,p.excerpt,p.body,p.cover,p.cover_alt,p.status,p.created_at,p.updated_at,p.published_at,p.revision,p.category,p.post_type));
  const updateIndex=writes.length-1;writes.push(env.DB.prepare('DELETE FROM revisions WHERE post_id=? AND id NOT IN (SELECT id FROM revisions WHERE post_id=? ORDER BY id DESC LIMIT 30)').bind(id,id));const result=await env.DB.batch(writes);if(old&&!result[updateIndex].meta.changes)fail('This entry changed in another tab. Reload before saving.',409);return json(p,old?200:201);
 }
 const preview=path.match(/^\/admin\/preview\/([a-f0-9-]+)$/);if(preview&&req.method==='GET'){const p=await env.DB.prepare('SELECT * FROM posts WHERE id=?').bind(preview[1]).first<Post>();return p?html(article(p,true)):html(shell('Not found','<section class="entry"><h1>Entry not found</h1></section>'),404);}
 if(req.method!=='GET'&&req.method!=='HEAD')return json({error:'Method not allowed.'},405);
 if(path==='/')return html(home((await publicPosts(env)).slice(0,4)));
 if(path==='/journal'){const category=url.searchParams.get('category')||'';const posts=await publicPosts(env);return html(journal(category?posts.filter(p=>(p.category||'Motherhood')===category):posts,category));}
 if(path==='/about')return html(about((await loadAbout(env.DB)).content));
 if(path==='/shop')return html(shop());
 if(path==='/sitemap.xml'){const base=env.SITE_URL.replace(/\/$/,'');const posts=await publicPosts(env);return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/','/journal','/about','/shop'].map(path=>`<url><loc>${e(base+path)}</loc></url>`).join('')}${posts.map(p=>`<url><loc>${e(base)}/journal/${e(p.slug)}</loc><lastmod>${e(p.updated_at)}</lastmod></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});}
 const entry=path.match(/^\/journal\/([a-z0-9-]+)$/);if(entry){const p=await env.DB.prepare("SELECT * FROM posts WHERE slug=? AND status='published'").bind(entry[1]).first<Post>();return p?html(article(p)):html(shell('Not found','<section class="entry"><h1>Entry not found</h1><a href="/journal">Visit the journal</a></section>'),404);}
 if(path==='/feed.xml'){const base=env.SITE_URL.replace(/\/$/,'');return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Momnasticism</title><link>${e(base)}</link><description>Motherhood as a life of prayer.</description>${(await publicPosts(env)).map(p=>`<item><title>${e(p.title)}</title><link>${e(base)}/journal/${e(p.slug)}</link><guid>${e(base)}/journal/${e(p.slug)}</guid><description>${e(p.excerpt)}</description><pubDate>${new Date(p.published_at!).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});}
 if(path==='/robots.txt')return new Response('User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: '+env.SITE_URL.replace(/\/$/,'')+'/sitemap.xml\n');
 return env.ASSETS.fetch(req);
}
