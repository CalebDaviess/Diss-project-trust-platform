-- Player-initiated game connections: extra attributes captured when a player links a game
-- account to their platform identity (publisher OAuth in production; mocked in the prototype).
-- All columns are nullable / defaulted so existing rows and the implicit upsert path are unaffected.
alter table game_connection add column game_name varchar(255);
alter table game_connection add column provider varchar(64);
alter table game_connection add column operator_account_ref varchar(255);
alter table game_connection add column image_url varchar(1024);
alter table game_connection add column status varchar(32) not null default 'active';
alter table game_connection add column linked_at timestamp with time zone;
