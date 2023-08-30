CREATE TABLE IF NOT EXISTS logs(
    id SERIAL PRIMARY KEY,
    status smallint NOT NULL,
    date bigint NOT NULL,
    pair varchar(10) NOT NULL,
    amount_bought decimal(20, 10),
    amount_returned decimal(20, 10) DEFAULT 0
)