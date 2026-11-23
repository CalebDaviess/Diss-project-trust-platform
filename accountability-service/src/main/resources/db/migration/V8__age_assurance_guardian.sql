-- Age assurance & parental (guardian-controlled) accounts.
-- A player self-declares 18+ at sign-up; the (mocked) ID check confirms it. Under-18s get a
-- guardian-controlled account: a verified adult guardian vouches for them and decides whether the
-- account may reach 18+ rated games. On turning 18 the holder verifies their own ID and the account
-- converts to a normal adult account. account_type is DB-defaulted so lazily-created profiles
-- (first game link / sample) are full adult accounts, and the native profile upsert keeps working.
alter table player_profile add column account_type varchar(24) not null default 'ADULT';
alter table player_profile add column holder_name varchar(120);
alter table player_profile add column guardian_name varchar(120);
alter table player_profile add column guardian_email varchar(255);
alter table player_profile add column mature_access_allowed boolean not null default true;
