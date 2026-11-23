-- Player appeals against confirmed sanctions. One active appeal per game connection at a time;
-- resolving it (approved/denied) is governance in production, simulated here.
create table appeal (
    appeal_id varchar(36) primary key,
    connection_id varchar(128) not null references game_connection(connection_id),
    profile_id varchar(128) not null references player_profile(profile_id),
    operator_id varchar(128) not null,
    game_id varchar(128) not null,
    offence_type varchar(64),
    grounds varchar(64),
    description varchar(2000) not null,
    evidence_count int not null default 0,
    status varchar(32) not null default 'submitted',
    submitted_at timestamp with time zone not null,
    resolved_at timestamp with time zone,
    decision_note varchar(2000)
);

create index idx_appeal_profile on appeal(profile_id, submitted_at);
create index idx_appeal_connection on appeal(connection_id);
