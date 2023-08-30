CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    uid bigint NOT NULL UNIQUE,
    uname varchar(24) NOT NULL
)