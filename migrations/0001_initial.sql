CREATE TABLE posts (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
 excerpt TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
 cover TEXT NOT NULL DEFAULT '', cover_alt TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, published_at TEXT,
 revision INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX posts_public ON posts(status,published_at);
CREATE TABLE revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id TEXT NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE media (key TEXT PRIMARY KEY,type TEXT NOT NULL,created_at TEXT NOT NULL);
