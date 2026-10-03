'use strict';
const $=id=>document.getElementById(id);
const fields=['title','slug','excerpt','body','cover','cover_alt','category','post_type'];
let current=null,posts=[],dirty=false,timer,busy=false,epoch=0,previewEpoch=0;
const recoveryKey=p=>'momnasticism-draft-'+(p?.id||'new');
async function api(path,options={}){
 const response=await fetch('/api/admin/'+path,{...options,headers:{'X-Momnasticism-Request':'1',...(options.body&&typeof options.body==='string'?{'Content-Type':'application/json'}:{}),...options.headers}});
 if(response.status===401){throw new Error('Your sign-in has expired. Copy your writing, then sign in again.');}
 let data;try{data=await response.json();}catch{throw new Error('Sign-in or server connection needs attention. Your local draft is retained.');}
 if(!response.ok)throw new Error(data.error||'The request failed.');return data;
}
function values(){return Object.fromEntries(fields.map(f=>[f,$(f).value]));}
function recover(){try{localStorage.setItem(recoveryKey(current),JSON.stringify({...values(),saved:Date.now()}));}catch{$('save-status').textContent='This browser cannot keep a recovery copy. Save your draft before leaving.';}}
function markDirty(){dirty=true;epoch++;recover();clearTimeout(timer);$('save-status').textContent=current?.status==='published'?'Changes kept on this device. Press Update live entry when ready.':'Saving draft shortly…';timer=setTimeout(()=>{if(current?.status!=='published'&&$('title').value.trim())save('draft').catch(showError);},1500);}
function showError(error){$('save-status').textContent=error.message;$('message').textContent=error.message;}
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
 clearTimeout(timer);setBusy(true);let succeeded=false;const before=epoch,oldKey=recoveryKey(current);const data={...values(),status,revision:current?.revision};
 try{const p=await api('posts'+(current?'/'+current.id:''),{method:current?'PUT':'POST',body:JSON.stringify(data)});current=p;$('id').value=p.id;
  if(epoch===before){dirty=false;localStorage.removeItem(oldKey);localStorage.removeItem(recoveryKey(p));$('slug').value=p.slug;}
  else{localStorage.removeItem(oldKey);recover();}
  posts=posts.filter(x=>x.id!==p.id);posts.unshift(p);renderList();$('publish').textContent=status==='published'?'Update live entry':'Publish entry';$('save').hidden=status==='published';$('unpublish').hidden=status!=='published';$('delete').hidden=false;
  $('save-status').textContent=(dirty?'Saved. Newer changes are waiting to save.':status==='published'?'Published. Your entry is live.':'Draft saved · '+new Date().toLocaleTimeString());await loadVersions();succeeded=true;return true;
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
