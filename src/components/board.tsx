import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Database, GripVertical, Lock, RefreshCw } from "lucide-react";
import {
  createTask,
  deleteTask,
  getBoard,
  moveTask,
  renameTask,
  STATUSES,
  type BoardSnapshot,
  type MutationResult,
  type Task,
  type TaskStatus,
} from "@/lib/tasks";

const COLUMN_HINT: Record<TaskStatus, string> = {
  "to do": "Можно удалить и перенести",
  "in progress": "Можно править, удалить и таскать",
  done: "Нельзя менять и удалять",
};

const MOVE_LABEL: Record<TaskStatus, string> = {
  "to do": "В To do",
  "in progress": "В работу",
  done: "В Done",
};

function sourceLabel(source: BoardSnapshot["source"]) {
  return source === "neon" ? "Neon Postgres" : "PGLite · встроенный Postgres";
}

function stamp(value: string) {
  return value.replace("T", " ").slice(0, 19);
}

function targetsFor(status: TaskStatus): TaskStatus[] {
  return STATUSES.filter((item) => item !== status);
}

export function Board({ initial }: { initial: BoardSnapshot }) {
  const create = useServerFn(createTask);
  const rename = useServerFn(renameTask);
  const remove = useServerFn(deleteTask);
  const move = useServerFn(moveTask);
  const reload = useServerFn(getBoard);

  const [board, setBoard] = useState(initial);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [editing, setEditing] = useState<{ id: number; title: string } | null>(null);
  const [seal, setSeal] = useState<Task | null>(null);
  const [pulseId, setPulseId] = useState<number | null>(null);
  const dragId = useRef<number | null>(null);

  async function apply(result: MutationResult) {
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    setBoard(result.board);
    setPulseId(result.board.events[0]?.id ?? null);
  }

  async function run(work: () => Promise<MutationResult>) {
    if (pending) return;
    setPending(true);
    try {
      await apply(await work());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка записи в базу");
    } finally {
      setPending(false);
    }
  }

  async function onCreate() {
    const next = title.trim();
    if (!next) {
      setError("Введите название");
      return;
    }
    if (pending) return;
    setPending(true);
    try {
      const result = await create({ data: { title: next } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError("");
      setBoard(result.board);
      setPulseId(result.board.events[0]?.id ?? null);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка записи в базу");
    } finally {
      setPending(false);
    }
  }

  function requestMove(task: Task, status: TaskStatus) {
    if (task.status === "done" || task.status === status) return;
    if (status === "done") {
      setSeal(task);
      return;
    }
    void run(() => move({ data: { id: task.id, status } }));
  }

  function onDrop(status: TaskStatus, rawId: string) {
    const fromTransfer = Number(rawId);
    const id = dragId.current ?? (Number.isInteger(fromTransfer) ? fromTransfer : null);
    setOver(null);
    if (id == null) return;
    const task = board.tasks.find((item) => item.id === id);
    if (!task) return;
    requestMove(task, status);
  }

  const grouped = STATUSES.map((status) => ({
    status,
    tasks: board.tasks.filter((task) => task.status === status),
  }));

  return (
    <div className="min-h-screen">
      <header className="border-b border-line px-4 py-6 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">
              Трекер задач
            </p>
            <h1 className="mt-1 text-4xl leading-none text-ink">Лоток</h1>
            <p className="mt-3 text-pretty text-muted">
              У задачи два поля: название и статус. To do, in progress и done
              хранятся в Postgres — справа видно само соединение и каждый SQL.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm">
            <span className="size-2 rounded-full bg-accent" aria-hidden />
            <Database className="size-4 text-accent" aria-hidden />
            <span>{sourceLabel(board.source)}</span>
          </div>
        </div>
        <details className="mt-5 max-w-3xl rounded-2xl border border-line bg-card px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Инструкция: правила и как данные попадают в базу
          </summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
            <li>Новая задача создаётся только в To do. Это INSERT в таблицу tasks.</li>
            <li>To do можно удалить и перетащить в in progress или done.</li>
            <li>
              In progress можно править, удалять и перетаскивать в обе стороны,
              включая done.
            </li>
            <li>
              Done окончательный: карточку нельзя вернуть, переименовать или
              удалить. Перед переносом будет подтверждение.
            </li>
            <li>
              Каждое действие пишет строку в task_events с текстом SQL и
              параметрами. Кнопка «Перечитать» заново выполняет SELECT.
            </li>
          </ol>
        </details>
      </header>

      {error ? (
        <p
          role="alert"
          className="mx-4 mt-4 rounded-2xl border border-danger/30 bg-card px-4 py-3 text-sm text-danger sm:mx-8"
        >
          {error}
        </p>
      ) : null}

      <div className="grid items-start gap-4 px-4 py-5 sm:px-6 lg:grid-cols-4">
        <div className="grid gap-3 sm:grid-cols-3 lg:col-span-3">
          {grouped.map((column) => (
            <section
              key={column.status}
              aria-label={column.status}
              onDragOver={(event) => {
                if (dragId.current == null) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setOver(column.status);
              }}
              onDrop={(event) => {
                event.preventDefault();
                onDrop(column.status, event.dataTransfer.getData("text/plain"));
              }}
              className={
                "flex min-h-80 min-w-0 flex-col rounded-3xl border p-3 transition-colors duration-200 " +
                (over === column.status
                  ? "border-accent bg-accent-soft"
                  : column.status === "done"
                    ? "border-line bg-locked"
                    : "border-line bg-wash")
              }
            >
              <div className="flex items-baseline justify-between gap-3 px-2 py-2">
                <div>
                  <h2 className="text-2xl capitalize">{column.status}</h2>
                  <p className="text-sm text-muted">{COLUMN_HINT[column.status]}</p>
                </div>
                <span className="font-mono text-sm text-muted tabular-nums">
                  {column.tasks.length}
                </span>
              </div>

              {column.status === "to do" ? (
                <form
                  className="mb-3 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void onCreate();
                  }}
                >
                  <label className="sr-only" htmlFor="new-task">
                    Название задачи
                  </label>
                  <input
                    id="new-task"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Новая задача"
                    maxLength={180}
                    disabled={pending}
                    className="min-h-11 min-w-0 flex-1 rounded-full border border-line bg-card px-4 text-sm outline-none"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="min-h-11 shrink-0 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-40"
                  >
                    Добавить
                  </button>
                </form>
              ) : null}

              <div className="flex flex-1 flex-col gap-3">
                {column.tasks.length === 0 ? (
                  <p className="px-2 py-6 text-sm text-muted">
                    {column.status === "done"
                      ? "Сюда попадают закрытые задачи."
                      : "Пусто. Перетащите карточку сюда."}
                  </p>
                ) : null}
                {column.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    pending={pending}
                    editing={editing?.id === task.id ? editing.title : null}
                    onDragStart={() => {
                      dragId.current = task.id;
                    }}
                    onDragEnd={() => {
                      dragId.current = null;
                      setOver(null);
                    }}
                    onMove={(status) => requestMove(task, status)}
                    onDelete={() => void run(() => remove({ data: { id: task.id } }))}
                    onStartEdit={() => setEditing({ id: task.id, title: task.title })}
                    onEditChange={(value) =>
                      setEditing((current) =>
                        current && current.id === task.id ? { ...current, title: value } : current,
                      )
                    }
                    onCancelEdit={() => setEditing(null)}
                    onSaveEdit={() => {
                      if (!editing || editing.id !== task.id) return;
                      const next = editing.title.trim();
                      setEditing(null);
                      if (!next || next === task.title) return;
                      void run(() => rename({ data: { id: task.id, title: next } }));
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <Ledger
          board={board}
          pulseId={pulseId}
          pending={pending}
          onReload={async () => {
            if (pending) return;
            setPending(true);
            setError("");
            try {
              const next = await reload();
              setBoard(next);
              setPulseId(null);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Не удалось прочитать базу");
            } finally {
              setPending(false);
            }
          }}
        />
      </div>

      {seal ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-ink/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="seal-title"
            className="w-full max-w-md rounded-3xl border border-line bg-card p-6"
          >
            <div className="mb-3 grid size-11 place-items-center rounded-full bg-locked text-ink">
              <Lock className="size-5" aria-hidden />
            </div>
            <h2 id="seal-title" className="text-2xl">
              Закрыть задачу?
            </h2>
            <p className="mt-2 text-pretty text-muted">
              «{seal.title}» попадёт в done. После этого её нельзя перетащить
              обратно, переименовать или удалить.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const task = seal;
                  setSeal(null);
                  void run(() => move({ data: { id: task.id, status: "done" } }));
                }}
                className="min-h-11 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-40"
              >
                Перенести в Done
              </button>
              <button
                type="button"
                onClick={() => setSeal(null)}
                className="min-h-11 rounded-full border border-line bg-card px-4 text-sm font-semibold"
              >
                Оставить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TaskCard({
  task,
  pending,
  editing,
  onDragStart,
  onDragEnd,
  onMove,
  onDelete,
  onStartEdit,
  onEditChange,
  onCancelEdit,
  onSaveEdit,
}: {
  task: Task;
  pending: boolean;
  editing: string | null;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (status: TaskStatus) => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onEditChange: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
}) {
  const locked = task.status === "done";
  return (
    <article
      className={
        "min-w-0 rounded-2xl border border-line bg-card p-3 " +
        (task.status === "in progress" ? "border-l-4 border-l-accent" : "")
      }
    >
      <div className="flex items-start gap-2">
        {locked ? (
          <span className="grid size-11 shrink-0 place-items-center text-muted" aria-hidden>
            <Lock className="size-4" />
          </span>
        ) : (
          <div
            draggable={!pending && editing == null}
            aria-hidden
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", String(task.id));
              event.dataTransfer.effectAllowed = "move";
              onDragStart();
            }}
            onDragEnd={onDragEnd}
            className="grid size-11 shrink-0 cursor-grab place-items-center text-muted active:cursor-grabbing"
          >
            <GripVertical className="size-5" />
          </div>
        )}
        <div className="min-w-0 flex-1 pt-2">
          {editing != null ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onSaveEdit();
              }}
            >
              <label className="sr-only" htmlFor={`edit-${task.id}`}>
                Название
              </label>
              <input
                id={`edit-${task.id}`}
                value={editing}
                autoFocus
                maxLength={180}
                disabled={pending}
                onChange={(event) => onEditChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") onCancelEdit();
                }}
                className="min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm outline-none"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="min-h-11 rounded-full bg-accent px-3 text-sm font-semibold text-accent-ink disabled:opacity-40"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="min-h-11 rounded-full border border-line px-3 text-sm font-semibold"
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <h3 className="break-words text-base leading-snug font-semibold">{task.title}</h3>
          )}
        </div>
      </div>

      {locked ? (
        <p className="mt-2 px-2 text-sm text-muted">Закрыта. Изменения запрещены.</p>
      ) : editing != null ? null : (
        <div className="mt-3 flex flex-wrap gap-2">
          {targetsFor(task.status).map((status) => (
            <button
              key={status}
              type="button"
              disabled={pending}
              onClick={() => onMove(status)}
              className="min-h-11 rounded-full border border-line bg-paper px-3 text-sm font-semibold disabled:opacity-40"
            >
              {MOVE_LABEL[status]}
            </button>
          ))}
          {task.status === "in progress" ? (
            <button
              type="button"
              disabled={pending}
              onClick={onStartEdit}
              className="min-h-11 rounded-full border border-line bg-paper px-3 text-sm font-semibold disabled:opacity-40"
            >
              Править
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={onDelete}
            className="min-h-11 rounded-full border border-danger/30 px-3 text-sm font-semibold text-danger disabled:opacity-40"
          >
            Удалить
          </button>
        </div>
      )}
    </article>
  );
}

function Ledger({
  board,
  pulseId,
  pending,
  onReload,
}: {
  board: BoardSnapshot;
  pulseId: number | null;
  pending: boolean;
  onReload: () => void;
}) {
  return (
    <aside className="min-w-0 rounded-3xl border border-line bg-card p-4 lg:sticky lg:top-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl">База</h2>
          <p className="text-sm text-muted">
            {sourceLabel(board.source)}. Запрос прошёл, строк в tasks:{" "}
            <span className="tabular-nums">{board.tasks.length}</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={onReload}
          disabled={pending}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-line disabled:opacity-40"
          aria-label="Перечитать из базы"
        >
          <RefreshCw className="size-4" aria-hidden />
        </button>
      </div>

      <p className="mt-4 font-mono text-xs leading-relaxed text-muted">
        select id, title, status, updated_at
        <br />
        from tasks order by id;
      </p>

      <ul className="mt-3 divide-y divide-line border-y border-line">
        {board.tasks.map((task) => (
          <li key={task.id} className="grid grid-cols-[auto_1fr] gap-x-3 py-2 font-mono text-xs">
            <span className="text-muted tabular-nums">#{task.id}</span>
            <span className="text-accent">{task.status}</span>
            <span className="col-span-2 break-words text-ink">{task.title}</span>
            <span className="col-span-2 text-muted tabular-nums">{stamp(task.updated_at)}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-5 font-sans text-sm font-semibold tracking-wide text-ink uppercase">
        Журнал SQL
      </h3>
      <ol className="mt-2 flex max-h-96 flex-col gap-3 overflow-auto pr-1">
        {board.events.map((event) => (
          <li
            key={event.id}
            className={
              "rounded-2xl border border-line p-3 " + (event.id === pulseId ? "tape-in" : "")
            }
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-xs font-medium text-accent uppercase">
                {event.action}
              </span>
              <span className="font-mono text-xs text-muted tabular-nums">
                {stamp(event.created_at)}
              </span>
            </div>
            <p className="mt-1 text-sm">{event.detail}</p>
            <pre className="mt-2 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-muted">
              {event.sql_text}
            </pre>
          </li>
        ))}
      </ol>
    </aside>
  );
}
