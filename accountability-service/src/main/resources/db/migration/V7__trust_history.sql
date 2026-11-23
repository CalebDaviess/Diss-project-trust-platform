-- Trust-over-time history: an append-only series of the player's global trust score at each change
-- (ban, anti-cheat verdict, appeal overturn). The graph starts at the profile's creation (score 100)
-- and moves with these events. created_at is DB-defaulted so the existing profile upsert still works.
alter table player_profile add column created_at timestamp with time zone not null default now();

create table trust_history (
    id varchar(36) primary key,
    profile_id varchar(128) not null references player_profile(profile_id),
    occurred_at timestamp with time zone not null,
    score int not null,
    reason varchar(64)
);

create index idx_trust_history_profile on trust_history(profile_id, occurred_at);
