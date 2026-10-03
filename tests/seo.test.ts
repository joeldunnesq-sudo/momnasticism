import {test} from 'node:test';
import assert from 'node:assert/strict';
import {metadata} from '../src/seo';
import {Post} from '../src/content';

test('public page metadata identifies the canonical site and escaped article data',()=>{
 const homepage=metadata('Motherhood as a life of prayer');
 assert.match(homepage,/rel="canonical" href="https:\/\/momnasticism.com\/"/);
 assert.match(homepage,/Orthodox Motherhood/);
 const p:Post={id:'abc',slug:'quiet-prayer',title:'A prayer </script><script>alert(1)</script>',excerpt:'A reflection for moms & families.',body:'',cover:'',cover_alt:'',status:'published',created_at:'2026-10-03T12:00:00Z',updated_at:'2026-10-03T13:00:00Z',published_at:'2026-10-03T12:00:00Z',revision:1};
 const output=metadata(p.title,{path:'/journal/'+p.slug,description:p.excerpt,post:p});
 const structured=JSON.parse(output.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
 const article=structured['@graph'].find((item:any)=>item['@type']==='BlogPosting');
 assert.equal(article.headline,p.title);
 assert.equal(article.mainEntityOfPage,'https://momnasticism.com/journal/quiet-prayer');
 assert.equal(article.dateModified,p.updated_at);
 assert.ok(!output.includes('</script><script>'));
});

test('private previews omit canonical URLs and structured article metadata',()=>{
 const output=metadata('Private writing',{path:'/journal/private-writing',noindex:true});
 assert.match(output,/noindex, nofollow/);
 assert.ok(!output.includes('rel="canonical"'));
 assert.ok(!output.includes('application/ld+json'));
});
