-- Drop Table marker;
-- Drop Table author;
-- Drop Table popup;

-- Table : "marker"
Create Table marker(id serial primary key, lat real, lng real, author bigint, popup uuid);

-- Table : "author"
Create Table author(id serial primary key, name varchar(80), twitter varchar(20), home_city varchar(40));

-- Table : "popup"
Create Table popup(id uuid primary key, post_text varchar(255), hash_tags varchar(255), time timestamp);