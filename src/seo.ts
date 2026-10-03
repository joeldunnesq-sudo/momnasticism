import {escape as e, Post} from './content';

const origin='https://momnasticism.com';
export interface Seo {path?:string;description?:string;post?:Post;noindex?:boolean}
export function metadata(title:string, options:Seo={}) {
 const pages:Record<string,[string,string]>={
  'Motherhood as a life of prayer':['/','An Orthodox motherhood blog by Stephanie, reflecting on pregnancy, family life, and finding a life of prayer in the ordinary moments of being a mom.'],
  'Journal':['/journal','Read Stephanie’s reflections on Orthodox motherhood, pregnancy, family life, and prayer in the Momnasticism journal.'],
  'About Stephanie':['/about','Meet Stephanie, the Orthodox Christian wife and mother behind Momnasticism, a journal about motherhood and a life of prayer.'],
  'Shop':['/shop','The Momnasticism shop is coming soon. A future home for Stephanie’s watercolor paintings and thoughtful gifts inspired by the journal.']
 };
 const page=pages[title];const path=options.path||page?.[0];
 const description=options.description||page?.[1]||'Momnasticism — an Orthodox mother’s journal of faith, family, and prayer.';
 const fullTitle=title==='Motherhood as a life of prayer'?'Momnasticism | Orthodox Motherhood, Faith & Family':`${title} · Momnasticism`;
 let output=`<meta name="description" content="${e(description)}"><title>${e(fullTitle)}</title><meta name="theme-color" content="#353719"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon.png" type="image/png" sizes="96x96"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="alternate" type="application/rss+xml" title="Momnasticism journal" href="/feed.xml">`;
 if(options.noindex||!path)return output+'<meta name="robots" content="noindex, nofollow">';
 const canonical=origin+path;
 output+=`<link rel="canonical" href="${e(canonical)}"><meta property="og:site_name" content="Momnasticism"><meta property="og:type" content="${options.post?'article':'website'}"><meta property="og:title" content="${e(fullTitle)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${e(canonical)}"><meta property="og:locale" content="en_US"><meta property="og:image" content="https://momnasticism.com/social-share-v1.jpg"><meta property="og:image:secure_url" content="https://momnasticism.com/social-share-v1.jpg"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Momnasticism — Motherhood as a life of prayer, framed by watercolor flowers and olive branches"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://momnasticism.com/social-share-v1.jpg"><meta name="twitter:image:alt" content="Momnasticism — Motherhood as a life of prayer, framed by watercolor flowers and olive branches"><meta name="twitter:title" content="${e(fullTitle)}"><meta name="twitter:description" content="${e(description)}">`;
 const writer={'@type':'Person',name:'Stephanie',url:origin+'/about'};
 const schemas:unknown[]=[{'@type':'WebSite','@id':origin+'/#website',name:'Momnasticism',url:origin,description:pages['Motherhood as a life of prayer'][1],inLanguage:'en-US',author:writer}];
 if(options.post){const p=options.post;schemas.push({'@type':'BlogPosting',headline:p.title,description,mainEntityOfPage:canonical,url:canonical,datePublished:p.published_at,dateModified:p.updated_at,author:writer,inLanguage:'en-US',...(p.cover?{image:origin+p.cover}:{})});output+=`<meta property="article:published_time" content="${e(p.published_at)}"><meta property="article:modified_time" content="${e(p.updated_at)}">`;}
 else schemas.push({'@type':path==='/about'?'AboutPage':path==='/journal'?'CollectionPage':'WebPage',name:fullTitle,url:canonical,description,isPartOf:{'@id':origin+'/#website'}});
 if(path!=='/')schemas.push({'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:origin},{'@type':'ListItem',position:2,name:options.post?'Journal':title,item:options.post?origin+'/journal':canonical},...(options.post?[{'@type':'ListItem',position:3,name:title,item:canonical}]:[])]});
 return output+`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':schemas}).replace(/</g,'\\u003c')}</script>`;
}
