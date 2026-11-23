-- Ban type + appealability come from the game operator on the ban request. The platform only
-- stores and displays them (it never decides appealability itself). Defaults keep existing rows valid.
alter table external_ban add column ban_type varchar(32) not null default 'temporary';
alter table external_ban add column appealable boolean not null default true;
