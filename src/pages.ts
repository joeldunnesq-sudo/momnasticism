export const aboutFields = [
  {
    "key": "eyebrow",
    "label": "Intro label",
    "kind": "text"
  },
  {
    "key": "heading",
    "label": "Page heading",
    "kind": "markdown"
  },
  {
    "key": "intro",
    "label": "Biography",
    "kind": "markdown"
  },
  {
    "key": "why_heading",
    "label": "Story heading",
    "kind": "markdown"
  },
  {
    "key": "quote",
    "label": "Quotation",
    "kind": "text"
  },
  {
    "key": "why_body",
    "label": "Story",
    "kind": "text"
  },
  {
    "key": "family_caption",
    "label": "Family caption",
    "kind": "text"
  },
  {
    "key": "button",
    "label": "Journal button text",
    "kind": "text"
  },
  {
    "key": "portrait",
    "label": "Portrait",
    "kind": "photo"
  },
  {
    "key": "portrait_alt",
    "label": "Portrait description",
    "kind": "text"
  },
  {
    "key": "family",
    "label": "Family photograph",
    "kind": "photo"
  },
  {
    "key": "family_alt",
    "label": "Family photograph description",
    "kind": "text"
  },
  {
    "key": "couple",
    "label": "Couple photograph",
    "kind": "photo"
  },
  {
    "key": "couple_alt",
    "label": "Couple photograph description",
    "kind": "text"
  },
  {
    "key": "children",
    "label": "Motherhood photograph",
    "kind": "photo"
  },
  {
    "key": "children_alt",
    "label": "Motherhood photograph description",
    "kind": "text"
  },
  {
    "key": "quote_author",
    "label": "Quote author",
    "kind": "text"
  },
  {
    "key": "quote_source",
    "label": "Quote source label",
    "kind": "text"
  },
  {
    "key": "quote_url",
    "label": "Quote source URL",
    "kind": "url"
  }
] as const;
export const aboutDefaults = {
  "eyebrow": "Meet the writer",
  "heading": "Hello, I’m *Stephanie.*",
  "intro": "I’m an Orthodox Christian wife and mother. Momnasticism is a place to chronicle pregnancy, motherhood, and the life of prayer woven through it all.\n\nThe name grew out of an unexpected season in the hospital, when a priest encouraged me to receive that time as a season of monasticism. This journal makes room for reflection in that season and in the family life beyond it.",
  "why_heading": "Why *Momnasticism?*",
  "quote": "“To enter into married life is like entering a monastery.”",
  "why_body": "Her words help express the idea behind this journal: family life can be a place of prayer and spiritual formation. Caring for children, learning patience, and offering the ordinary work of each day to God are part of that calling. Momnasticism is a little name for exploring it.",
  "family_caption": "The family behind the journal.",
  "button": "Visit the journal ⟶",
  "portrait": "/photos/stephanie.jpg",
  "portrait_alt": "Stephanie smiling with a bouquet of pink and white flowers",
  "family": "/photos/stephanie-family.jpg",
  "family_alt": "Stephanie and her family together in a green field at sunset",
  "couple": "/photos/stephanie-and-joel.jpg",
  "couple_alt": "Stephanie and Joel smiling together outdoors",
  "children": "/photos/motherhood-moments.jpg",
  "children_alt": "Stephanie laughing as two of her children kiss her cheeks",
  "quote_author": "Mother Gavrilia",
  "quote_source": "On Marriage as a Sacrament",
  "quote_url": "https://saintgavrilia.org/pages/teachings"
};
export type AboutContent = typeof aboutDefaults;
export interface PageRecord {content:string;revision:number;updated_at:string}
export async function loadAbout(db:D1Database){const row=await db.prepare("SELECT * FROM pages WHERE id='about'").first<PageRecord>();return {content:row?{...aboutDefaults,...JSON.parse(row.content)} as AboutContent:aboutDefaults,revision:row?.revision||0};}
