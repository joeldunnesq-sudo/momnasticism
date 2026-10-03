import { marked } from 'marked';
export const escape = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function safeUrl(s:string):string {if(/^\/(?!\/)[^\s]*$/.test(s))return s;try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
const renderer=new marked.Renderer();
renderer.html=({text})=>escape(text);
renderer.link=({href,tokens})=>{const u=safeUrl(href);return u?`<a href="${escape(u)}" rel="noopener noreferrer">${marked.parser(tokens,{renderer})}</a>`:marked.parser(tokens,{renderer});};
renderer.image=({href,text})=>{const u=safeUrl(href);return u?`<img src="${escape(u)}" alt="${escape(text)}" loading="lazy">`:escape(text);};
export const markdown=(s:string)=>marked.parse(s,{renderer,async:false}) as string;
export const slugify=(s:string)=>s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);
export interface Post {id:string;slug:string;title:string;excerpt:string;body:string;cover:string;cover_alt:string;status:'draft'|'published';created_at:string;updated_at:string;published_at:string|null;revision:number}
