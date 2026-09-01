-- Paper decision log: accept / ignore / size-down against a stored memo
alter table decisions add column if not exists paper_action text not null default 'pending';
alter table decisions add column if not exists paper_size_pct real;
