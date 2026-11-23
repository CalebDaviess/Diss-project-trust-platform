-- Credential store for POST /auth. Passwords are stored as bcrypt (modular-crypt) hashes only;
-- raw passwords are never persisted. profile_id is the hashed identity token used as the JWT `sub`
-- and links a login to its platform profile (see Identity-Model / Contract 0).
create table user_credential (
    username varchar(255) primary key,
    profile_id varchar(128) not null,
    password_hash varchar(255) not null,
    roles varchar(255) not null default 'player'
);

create index idx_user_credential_profile on user_credential(profile_id);

