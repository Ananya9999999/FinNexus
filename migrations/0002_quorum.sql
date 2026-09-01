-- QUORUM per-user investor profiles, holdings, and analysis sessions
create table if not exists investor_profiles (
  user_id text primary key,
  display_name text not null,
  risk_tolerance text not null default 'moderate',
  investment_horizon text not null default 'medium',
  max_position_pct real not null default 12,
  preferred_sectors text not null default '[]',
  avoid_sectors text not null default '[]',
  behavioral_flags text not null default '[]',
  cash_pct real not null default 15,
  watchlist text not null default '[]',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists holdings (
  id serial primary key,
  user_id text not null,
  ticker text not null,
  quantity real not null default 0,
  avg_price real not null default 0,
  weight_pct real not null default 0
);
create unique index if not exists holdings_user_ticker_idx on holdings (user_id, ticker);
create index if not exists holdings_user_id_idx on holdings (user_id);

create table if not exists decisions (
  id serial primary key,
  user_id text not null,
  session_id text not null,
  ticker text not null,
  signal text not null,
  confidence real not null,
  score real not null,
  recommendation text not null,
  latency_ms real not null default 0,
  agreement real not null default 0,
  hhi real not null default 0,
  data_quality text not null default 'full',
  result_json text not null,
  created_at timestamptz not null default now()
);
create index if not exists decisions_user_idx on decisions (user_id, created_at desc);
