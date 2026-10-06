'use strict';
const $=id=>document.getElementById(id);
const fields=['title','slug','excerpt','body','cover','cover_alt','category','post_type'];
let current=null,posts=[],dirty=false,timer,busy=false,epoch=0,previewEpoch=0;
const recoveryKey=p=>'momnasticism-draft-'+(p?.id||'new');
async function api(path,options={}){
 let response;
 try{response=await fetch('/api/admin/'+path,{...options,credentials:'same-origin',redirect:'manual',headers:{'X-Momnasticism-Request':'1',...(options.body&&typeof options.body==='string'?{'Content-Type':'application/json'}:{}),...options.headers}});}
 catch{throw new Error('The connection was interrupted. Your writing is still in this editor. Reconnect your sign-in, then try saving again.');}
 // Access redirects expired sessions to another origin. Do not follow that
 // redirect in fetch: the browser blocks it and hides the useful auth error.
 if(response.type==='opaqueredirect'||response.status===401){throw new Error('Your sign-in has expired. Your writing is still in this editor. Use Reconnect sign-in below, then return here and save again.');}
 let data;try{data=await response.json();}catch{throw new Error('Sign-in or server connection needs attention. Your local draft is retained.');}
 if(!response.ok)throw new Error(data.error||'The request failed.');return data;
}
function values(){return Object.fromEntries(fields.map(f=>[f,$(f).value]));}
function recover(){try{localStorage.setItem(recoveryKey(current),JSON.stringify({...values(),saved:Date.now()}));}catch{$('save-status').textContent='This browser cannot keep a recovery copy. Save your draft before leaving.';}}
function markDirty(){dirty=true;epoch++;recover();clearTimeout(timer);$('save-status').textContent=current?.status==='published'?'Changes kept on this device. Press Update live entry when ready.':'Saving draft shortly…';timer=setTimeout(()=>{if(current?.status!=='published'&&$('title').value.trim())save('draft').catch(showError);},1500);}
function showError(error){if(!$('editor').hidden)recover();$('save-status').textContent=error.message;$('message').textContent=error.message;$('connection-help').hidden=false;}
function renderList(){const list=$('posts');list.replaceChildren();for(const p of posts){const b=document.createElement('button');b.className='post-choice'+(p.id===current?.id?' active':'');b.type='button';b.append(document.createTextNode(p.title));const s=document.createElement('small');s.textContent=p.status==='published'?'Published':'Draft';b.append(s);b.onclick=()=>openEntry(p);list.append(b);}}
function setBusy(value){busy=value;for(const id of ['new','save','publish','unpublish','delete','photo','inline-photo','remove-cover'])$(id).disabled=value;document.querySelectorAll('.post-choice').forEach(b=>b.disabled=value);}
function updateCover(){const img=$('cover-preview');img.hidden=!$('cover').value;if($('cover').value)img.src=$('cover').value;else img.removeAttribute('src');$('remove-cover').hidden=!$('cover').value;}
function openEntry(p=null){
 if(busy)return;if(dirty&&!confirm('You have unsaved changes. Leave this entry? A recovery copy stays on this device.'))return;
 clearTimeout(timer);current=p?{...p}:null;dirty=false;epoch++;$('editor').hidden=false;$('preview-content').hidden=true;
 for(const f of fields)$(f).value=p?.[f]||(f==='category'?'Motherhood':f==='post_type'?'reflection':'');$('id').value=p?.id||'';$('photo').value='';
 $('publish').textContent=p?.status==='published'?'Update live entry':'Publish entry';$('save').hidden=p?.status==='published';$('unpublish').hidden=p?.status!=='published';$('delete').hidden=!p;$('save-status').textContent=p?'Saved entry loaded.':'Begin a new entry.';
 updateCover();renderList();loadVersions();
 try{const local=JSON.parse(localStorage.getItem(recoveryKey(p))||'null');if(local&&fields.some(f=>local[f]!==$(f).value)&&confirm('There is a recovery draft on this device. Restore it?')){for(const f of fields)$(f).value=local[f]||'';updateCover();markDirty();}}catch{}
}
async function loadVersions(){const root=$('versions');root.replaceChildren();if(!current)return;const id=current.id;try{const versions=await api('posts/'+id+'/versions');if(current?.id!==id)return;for(const v of versions){const b=document.createElement('button');b.type='button';b.className='version text-link';b.textContent='Restore '+new Date(v.created_at).toLocaleString();b.onclick=()=>{if(busy||!confirm('Load this older version into the editor? Publish status will stay unchanged until you save.'))return;const old=JSON.parse(v.snapshot);for(const f of fields)$(f).value=old[f]||'';updateCover();markDirty();};root.append(b);}if(!versions.length)root.textContent='Saved versions will appear here.';}catch(error){root.textContent=error.message;}}
async function save(status){
 if(busy)return false;if(!$('title').value.trim())throw new Error('Give your entry a title first.');
 clearTimeout(timer);recover();setBusy(true);let succeeded=false;const before=epoch,oldKey=recoveryKey(current);const data={...values(),status,revision:current?.revision};
 try{const p=await api('posts'+(current?'/'+current.id:''),{method:current?'PUT':'POST',body:JSON.stringify(data)});current=p;$('id').value=p.id;
  if(epoch===before){dirty=false;localStorage.removeItem(oldKey);localStorage.removeItem(recoveryKey(p));$('slug').value=p.slug;}
  else{localStorage.removeItem(oldKey);recover();}
  posts=posts.filter(x=>x.id!==p.id);posts.unshift(p);renderList();$('publish').textContent=status==='published'?'Update live entry':'Publish entry';$('save').hidden=status==='published';$('unpublish').hidden=status!=='published';$('delete').hidden=false;
  $('connection-help').hidden=true;$('save-status').textContent=(dirty?'Saved. Newer changes are waiting to save.':status==='published'?'Published. Your entry is live.':'Draft saved · '+new Date().toLocaleTimeString());await loadVersions();succeeded=true;return true;
 }finally{setBusy(false);if(succeeded&&dirty&&current?.status==='draft')timer=setTimeout(()=>save('draft').catch(showError),1500);}
}
$('editor').onsubmit=event=>event.preventDefault();$('editor').oninput=event=>{if(fields.includes(event.target.id))markDirty();};
$('new').onclick=()=>openEntry();$('save').onclick=()=>save('draft').catch(showError);
$('publish').onclick=()=>{if(confirm(current?.status==='published'?'Update the public entry with these changes?':'Publish this entry for everyone to read?'))save('published').catch(showError);};
$('unpublish').onclick=()=>{if(confirm('Remove this entry from the public journal and keep it as a draft?'))save('draft').catch(showError);};
$('delete').onclick=async()=>{if(busy||!current||!confirm('Permanently delete this entry and its saved versions?'))return;clearTimeout(timer);setBusy(true);try{await api('posts/'+current.id,{method:'DELETE'});localStorage.removeItem(recoveryKey(current));posts=posts.filter(x=>x.id!==current.id);current=null;dirty=false;$('editor').hidden=true;renderList();$('message').textContent='Entry deleted.';}catch(error){showError(error);}finally{setBusy(false);}};
$('preview').onclick=async()=>{const version=++previewEpoch;try{const data=await api('preview',{method:'POST',body:JSON.stringify({body:$('body').value})});if(version!==previewEpoch)return;const root=$('preview-content');root.innerHTML=data.html;root.hidden=false;root.scrollIntoView({behavior:'smooth',block:'start'});}catch(error){showError(error);}};
$('export').onclick=()=>{location.href='/api/admin/export';};
async function upload(file){if(!file)return;if(file.size>10*1024*1024)throw new Error('Choose a photo smaller than 10 MB.');return api('upload',{method:'POST',body:file,headers:{'Content-Type':file.type||'application/octet-stream'}});}
$('photo').onchange=async()=>{if(busy)return;clearTimeout(timer);setBusy(true);try{$('save-status').textContent='Uploading photo…';const data=await upload($('photo').files[0]);if(data){$('cover').value=data.url;updateCover();markDirty();}}catch(error){showError(error);}finally{setBusy(false);}};
$('remove-cover').onclick=()=>{$('cover').value='';updateCover();markDirty();};
function insert(before,after=''){const area=$('body'),start=area.selectionStart,end=area.selectionEnd,text=area.value.slice(start,end);area.setRangeText(before+text+after,start,end,'end');area.focus();markDirty();}
for(const b of document.querySelectorAll('[data-format]'))b.onclick=()=>{const format=b.dataset.format;if(format==='bold')insert('**','**');if(format==='italic')insert('*','*');if(format==='heading')insert('\n## ');if(format==='quote')insert('\n> ');if(format==='list')insert('\n- ');if(format==='link'){const url=prompt('Link address (https://…)');if(url&&/^https?:\/\//i.test(url))insert('[',']('+url.replace(/[()\s]/g,c=>encodeURIComponent(c))+')');}};
$('inline-photo').onclick=()=>{const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp,image/gif';input.onchange=async()=>{if(busy)return;clearTimeout(timer);setBusy(true);try{const data=await upload(input.files[0]);if(data){const alt=(prompt('Describe the photo:')||'').replace(/[\[\]]/g,'');insert('\n!['+alt+']('+data.url+')\n');}}catch(error){showError(error);}finally{setBusy(false);}};input.click();};
window.addEventListener('beforeunload',event=>{if(dirty){recover();event.preventDefault();event.returnValue='';}});
api('posts').then(data=>{posts=data;renderList();$('message').textContent='A quiet place to write. Drafts stay private until you publish.';}).catch(showError);

$('entry-template').onclick=()=>{const outlines={poetry:'A first line\nA second line\n\nA new stanza\n\n',recipe:'## The story behind this recipe\n\n\n## At a glance\n\n- Servings: \n- Prep time: \n- Cook time: \n\n## Ingredients\n\n- \n\n## Instructions\n\n1. \n\n## Notes and variations\n\n',guide:'## What helped\n\n\n## What you will need\n\n- \n\n## Step by step\n\n1. \n\n## A gentle reminder\n\n', 'photo-essay':'## A moment worth remembering\n\n\n## The little details\n\n',reflection:'## A moment from today\n\n\n## What I am learning\n\n'};if($('body').value.trim()&&!confirm('Append a writing outline to this entry?'))return;$('body').value+='\n'+outlines[$('post_type').value];if($('post_type').value==='recipe')$('category').value='Recipes';markDirty();};

// About page changes remain local until the writer explicitly saves them.
const aboutForm=$('about-editor'),aboutPanel=aboutForm.closest('details');
let aboutRevision=0,aboutLoaded=false,aboutDirty=false,aboutBusy=false;
const aboutInputs=()=>Array.from(aboutForm.querySelectorAll('#about-fields textarea, #about-fields input[type="hidden"]'));
const aboutValues=()=>Object.fromEntries(aboutInputs().map(input=>[input.id.slice(6),input.value]));
function aboutPhotos(){for(const img of aboutForm.querySelectorAll('.page-photo-preview')){const input=$(img.id.replace('-preview',''));img.hidden=!input.value;if(input.value)img.src=input.value;else img.removeAttribute('src');}}
function aboutRecover(){try{localStorage.setItem('momnasticism-about-recovery',JSON.stringify({content:aboutValues(),revision:aboutRevision}));}catch{$('about-status').textContent='This browser cannot keep a recovery copy. Save before leaving.';}}
function aboutChanged(){aboutDirty=true;aboutRecover();$('about-status').textContent='Unsaved changes. Press Save About page to update the live page.';aboutPhotos();}
function aboutLock(value){aboutBusy=value;for(const input of aboutForm.querySelectorAll('input,textarea,button'))input.disabled=value;}
function aboutError(error){$('about-status').textContent=error.message;$('connection-help').hidden=false;}
aboutPanel.addEventListener('toggle',async()=>{
 if(!aboutPanel.open||aboutLoaded||aboutBusy)return;aboutLock(true);$('about-status').textContent='Loading About page…';
 try{const data=await api('pages/about');aboutRevision=data.revision;for(const input of aboutInputs())input.value=data.content[input.id.slice(6)]||'';aboutLoaded=true;aboutPhotos();$('about-status').textContent='Ready to edit. Changes go live only when you save.';
  try{const local=JSON.parse(localStorage.getItem('momnasticism-about-recovery')||'null');if(local&&Object.keys(aboutValues()).some(key=>local.content[key]!==data.content[key])&&confirm('Restore your unsaved About page changes from this device?')){for(const input of aboutInputs())input.value=local.content[input.id.slice(6)]||'';aboutChanged();if(local.revision!==data.revision){aboutRevision=local.revision;$('about-status').textContent='Recovery restored, but the live page has changed. Copy your edits, reload, and reapply them before saving.';}}}catch{}
 }catch(error){aboutError(error);}finally{aboutLock(false);}
});
aboutForm.addEventListener('input',event=>{if(event.target.matches('textarea'))aboutChanged();});
for(const button of aboutForm.querySelectorAll('[data-remove-photo]'))button.onclick=()=>{if(aboutBusy||!aboutLoaded)return;$('about-'+button.dataset.removePhoto).value='';aboutChanged();};
for(const input of aboutForm.querySelectorAll('input[type="file"]'))input.onchange=async()=>{if(aboutBusy||!aboutLoaded)return;aboutLock(true);try{$('about-status').textContent='Uploading photo…';const data=await upload(input.files[0]);if(data){$(input.id.replace('-upload','')).value=data.url;aboutChanged();}}catch(error){aboutError(error);}finally{input.value='';aboutLock(false);}};
aboutForm.onsubmit=async event=>{event.preventDefault();if(aboutBusy||!aboutLoaded)return;aboutRecover();aboutLock(true);try{const data=await api('pages/about',{method:'PUT',body:JSON.stringify({content:aboutValues(),revision:aboutRevision})});aboutRevision=data.revision;aboutDirty=false;try{localStorage.removeItem('momnasticism-about-recovery');}catch{}$('about-status').textContent='About page saved. Your changes are live.';}catch(error){aboutError(error);}finally{aboutLock(false);}};
window.addEventListener('beforeunload',event=>{if(aboutDirty){aboutRecover();event.preventDefault();event.returnValue='';}});
