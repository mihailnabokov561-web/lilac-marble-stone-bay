import { createServerFn } from "@tanstack/react-start";
import { dbSource, getSql, type Sql } from "@/lib/db";

export const STATUSES = ["to do", "in progress", "done"] as const;
export type TaskStatus = (typeof STATUSES)[number];

export type Task = {
  id: number;
  title: string;
  status: TaskStatus;
  updated_at: string;
};

export type TaskEvent = {
  id: number;
  task_id: number | null;
  action: string;
  sql_text: string;
  detail: string;
  created_at: string;
};

export type BoardSnapshot = {
  source: "neon" | "pglite";
  tasks: Task[];
  events: TaskEvent[];
};

export type MutationResult =
  | { ok: true; board: BoardSnapshot }
  | { ok: false; error: string };

function isStatus(value: string): value is TaskStatus {
  return (STATUSES as readonly string[]).includes(value);
}

function fail(error: string): MutationResult {
  return { ok: false, error };
}

function errorText(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Не получилось записать в базу";
}

function asNumber(value: unknown, label: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n)) throw new Error(`${label} вернулся не числом`);
  return n;
}

function parseId(id: unknown): number {
  const n = typeof id === "number" ? id : Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new Error("Некорректный идентификатор задачи");
  return n;
}

function parseTitle(title: unknown): string {
  if (typeof title !== "string") throw new Error("Название должно быть строкой");
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Введите название");
  if (trimmed.length > 180) throw new Error("Название длиннее 180 символов");
  return trimmed;
}

function parseStatus(status: unknown): TaskStatus {
  if (typeof status !== "string" || !isStatus(status)) {
    throw new Error("Статус может быть только to do, in progress или done");
  }
  return status;
}

function asTask(row: {
  id: unknown;
  title: string;
  status: string;
  updated_at: string;
}): Task {
  return {
    id: asNumber(row.id, "id"),
    title: row.title,
    status: parseStatus(row.status),
    updated_at: row.updated_at,
  };
}

async function readBoard(): Promise<BoardSnapshot> {
  const sql = await getSql();
  const tasks = await sql<{
    id: unknown;
    title: string;
    status: string;
    updated_at: string;
  }>`
    select id, title, status, updated_at::text as updated_at
    from tasks
    order by id
  `;
  const events = await sql<{
    id: unknown;
    task_id: unknown;
    action: string;
    sql_text: string;
    detail: string;
    created_at: string;
  }>`
    select id, task_id, action, sql_text, detail, created_at::text as created_at
    from task_events
    order by id desc
    limit 20
  `;
  return {
    source: dbSource,
    tasks: tasks.map(asTask),
    events: events.map((row) => ({
      id: asNumber(row.id, "id события"),
      task_id: row.task_id == null ? null : asNumber(row.task_id, "task_id"),
      action: row.action,
      sql_text: row.sql_text,
      detail: row.detail,
      created_at: row.created_at,
    })),
  };
}

async function record(
  sql: Sql,
  taskId: number | null,
  action: string,
  sqlText: string,
  detail: string,
) {
  await sql`
    insert into task_events (task_id, action, sql_text, detail)
    values (${taskId}, ${action}, ${sqlText}, ${detail})
  `;
}

export const getBoard = createServerFn({ method: "GET" }).handler(async () => {
  return readBoard();
});

export const createTask = createServerFn({ method: "POST" })
  .validator((input: unknown) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const title = parseTitle((data as { title?: unknown } | null)?.title);
      const sql = await getSql();
      const inserted = await sql<{ id: unknown }>`
        insert into tasks (title, status)
        values (${title}, 'to do')
        returning id
      `;
      const id = asNumber(inserted[0]?.id, "id");
      await record(
        sql,
        id,
        "insert",
        `insert into tasks (title, status)\nvalues ($1, 'to do')\nreturning id;\n\n$1 = ${title}`,
        `Создана задача #${id} со статусом to do`,
      );
      return { ok: true, board: await readBoard() };
    } catch (err) {
      return fail(errorText(err));
    }
  });

export const renameTask = createServerFn({ method: "POST" })
  .validator((input: unknown) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const body = data as { id?: unknown; title?: unknown } | null;
      const id = parseId(body?.id);
      const title = parseTitle(body?.title);
      const sql = await getSql();
      const rows = await sql<{ status: string }>`
        select status from tasks where id = ${id}
      `;
      const current = rows[0];
      if (!current) return fail("Задача не найдена");
      if (current.status !== "in progress") {
        return fail("Редактировать можно только задачу в статусе in progress");
      }
      const updated = await sql<{ id: unknown }>`
        update tasks
        set title = ${title}, updated_at = now()
        where id = ${id} and status = 'in progress'
        returning id
      `;
      if (!updated[0]) return fail("Не удалось обновить задачу");
      await record(
        sql,
        id,
        "update",
        `update tasks\nset title = $1, updated_at = now()\nwhere id = $2 and status = 'in progress';\n\n$1 = ${title}\n$2 = ${id}`,
        `Изменено название задачи #${id}`,
      );
      return { ok: true, board: await readBoard() };
    } catch (err) {
      return fail(errorText(err));
    }
  });

export const deleteTask = createServerFn({ method: "POST" })
  .validator((input: unknown) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const id = parseId((data as { id?: unknown } | null)?.id);
      const sql = await getSql();
      const rows = await sql<{ status: string; title: string }>`
        select status, title from tasks where id = ${id}
      `;
      const current = rows[0];
      if (!current) return fail("Задача не найдена");
      if (current.status === "done") return fail("Задачу в done нельзя удалить");
      const removed = await sql<{ id: unknown }>`
        delete from tasks
        where id = ${id} and status in ('to do', 'in progress')
        returning id
      `;
      if (!removed[0]) return fail("Не удалось удалить задачу");
      await record(
        sql,
        id,
        "delete",
        `delete from tasks\nwhere id = $1 and status in ('to do', 'in progress');\n\n$1 = ${id}`,
        `Удалена задача #${id} «${current.title}» (${current.status})`,
      );
      return { ok: true, board: await readBoard() };
    } catch (err) {
      return fail(errorText(err));
    }
  });

export const moveTask = createServerFn({ method: "POST" })
  .validator((input: unknown) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const body = data as { id?: unknown; status?: unknown } | null;
      const id = parseId(body?.id);
      const status = parseStatus(body?.status);
      const sql = await getSql();
      const rows = await sql<{ status: string; title: string }>`
        select status, title from tasks where id = ${id}
      `;
      const current = rows[0];
      if (!current) return fail("Задача не найдена");
      if (current.status === "done") {
        return fail("Задачу в done нельзя переносить, редактировать или удалять");
      }
      if (current.status === status) return { ok: true, board: await readBoard() };
      const updated = await sql<{ id: unknown }>`
        update tasks
        set status = ${status}, updated_at = now()
        where id = ${id} and status <> 'done'
        returning id
      `;
      if (!updated[0]) return fail("Не удалось перенести задачу");
      await record(
        sql,
        id,
        "update",
        `update tasks\nset status = $1, updated_at = now()\nwhere id = $2 and status <> 'done';\n\n$1 = ${status}\n$2 = ${id}`,
        `Задача #${id} «${current.title}»: ${current.status} → ${status}`,
      );
      return { ok: true, board: await readBoard() };
    } catch (err) {
      return fail(errorText(err));
    }
  });
