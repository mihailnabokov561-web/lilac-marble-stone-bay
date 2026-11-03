-- Task tracker. A task is a title plus one status.
-- position/timestamps are bookkeeping so the board can order cards
-- and the ledger can show that a row actually changed.

create table if not exists tasks (
  id         serial primary key,
  title      text not null check (char_length(trim(title)) between 1 and 180),
  status     text not null check (status in ('to do', 'in progress', 'done')),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_status_idx on tasks (status);

create table if not exists task_events (
  id         serial primary key,
  task_id    integer,
  action     text not null,
  sql_text   text not null,
  detail     text not null,
  created_at timestamptz not null default now()
);

insert into tasks (title, status) values
  ('Придумать название релиза', 'to do'),
  ('Проверить удаление из To do', 'to do'),
  ('Перетащить карточку между колонками', 'in progress'),
  ('Подключить таблицу tasks', 'done');

insert into task_events (task_id, action, sql_text, detail)
values (
  null,
  'migrate',
  E'create table tasks (\n  id serial primary key,\n  title text not null,\n  status text not null check (status in (''to do'', ''in progress'', ''done'')),\n  updated_at timestamptz not null default now()\n);',
  'Схема применена. Соединение с Postgres есть, таблицы tasks и task_events созданы.'
);
