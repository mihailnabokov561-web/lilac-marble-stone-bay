import { o as __toESM } from "../_runtime.mjs";
import { U as isRedirect, b as require_jsx_runtime, q as require_react, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Database, i as GripVertical, n as RefreshCw, r as Lock } from "../_libs/lucide-react.mjs";
import { a as deleteTask, c as renameTask, i as createTask, n as Route, o as getBoard, r as STATUSES, s as moveTask } from "./router-Bp-9Wc9J.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-iJdAeqpF.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function useServerFn(serverFn) {
	const router = useRouter();
	return import_react.useCallback(async (...args) => {
		try {
			const res = await serverFn(...args);
			if (isRedirect(res)) throw res;
			return res;
		} catch (err) {
			if (isRedirect(err)) {
				err.options._fromLocation = router.stores.location.get();
				return router.navigate(router.resolveRedirect(err).options);
			}
			throw err;
		}
	}, [router, serverFn]);
}
var COLUMN_HINT = {
	"to do": "Можно удалить и перенести",
	"in progress": "Можно править, удалить и таскать",
	done: "Нельзя менять и удалять"
};
var MOVE_LABEL = {
	"to do": "В To do",
	"in progress": "В работу",
	done: "В Done"
};
function sourceLabel(source) {
	return source === "neon" ? "Neon Postgres" : "PGLite · встроенный Postgres";
}
function stamp(value) {
	return value.replace("T", " ").slice(0, 19);
}
function targetsFor(status) {
	return STATUSES.filter((item) => item !== status);
}
function Board({ initial }) {
	const create = useServerFn(createTask);
	const rename = useServerFn(renameTask);
	const remove = useServerFn(deleteTask);
	const move = useServerFn(moveTask);
	const reload = useServerFn(getBoard);
	const [board, setBoard] = (0, import_react.useState)(initial);
	const [title, setTitle] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [pending, setPending] = (0, import_react.useState)(false);
	const [over, setOver] = (0, import_react.useState)(null);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [seal, setSeal] = (0, import_react.useState)(null);
	const [pulseId, setPulseId] = (0, import_react.useState)(null);
	const dragId = (0, import_react.useRef)(null);
	async function apply(result) {
		if (!result.ok) {
			setError(result.error);
			return;
		}
		setError("");
		setBoard(result.board);
		setPulseId(result.board.events[0]?.id ?? null);
	}
	async function run(work) {
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
	function requestMove(task, status) {
		if (task.status === "done" || task.status === status) return;
		if (status === "done") {
			setSeal(task);
			return;
		}
		run(() => move({ data: {
			id: task.id,
			status
		} }));
	}
	function onDrop(status, rawId) {
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
		tasks: board.tasks.filter((task) => task.status === status)
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "border-b border-line px-4 py-6 sm:px-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-end justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "max-w-xl",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold tracking-widest text-accent uppercase",
								children: "Трекер задач"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "mt-1 text-4xl leading-none text-ink",
								children: "Лоток"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-pretty text-muted",
								children: "У задачи два поля: название и статус. To do, in progress и done хранятся в Postgres — справа видно само соединение и каждый SQL."
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "size-2 rounded-full bg-accent",
								"aria-hidden": true
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Database, {
								className: "size-4 text-accent",
								"aria-hidden": true
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: sourceLabel(board.source) })
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
					className: "mt-5 max-w-3xl rounded-2xl border border-line bg-card px-4 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
						className: "cursor-pointer text-sm font-semibold",
						children: "Инструкция: правила и как данные попадают в базу"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
						className: "mt-3 list-decimal space-y-2 pl-5 text-sm text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Новая задача создаётся только в To do. Это INSERT в таблицу tasks." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "To do можно удалить и перетащить в in progress или done." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "In progress можно править, удалять и перетаскивать в обе стороны, включая done." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Done окончательный: карточку нельзя вернуть, переименовать или удалить. Перед переносом будет подтверждение." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Каждое действие пишет строку в task_events с текстом SQL и параметрами. Кнопка «Перечитать» заново выполняет SELECT." })
						]
					})]
				})]
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				role: "alert",
				className: "mx-4 mt-4 rounded-2xl border border-danger/30 bg-card px-4 py-3 text-sm text-danger sm:mx-8",
				children: error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid items-start gap-4 px-4 py-5 sm:px-6 lg:grid-cols-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid gap-3 sm:grid-cols-3 lg:col-span-3",
					children: grouped.map((column) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						"aria-label": column.status,
						onDragOver: (event) => {
							if (dragId.current == null) return;
							event.preventDefault();
							event.dataTransfer.dropEffect = "move";
							setOver(column.status);
						},
						onDrop: (event) => {
							event.preventDefault();
							onDrop(column.status, event.dataTransfer.getData("text/plain"));
						},
						className: "flex min-h-80 min-w-0 flex-col rounded-3xl border p-3 transition-colors duration-200 " + (over === column.status ? "border-accent bg-accent-soft" : column.status === "done" ? "border-line bg-locked" : "border-line bg-wash"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline justify-between gap-3 px-2 py-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-2xl capitalize",
									children: column.status
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted",
									children: COLUMN_HINT[column.status]
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-sm text-muted tabular-nums",
									children: column.tasks.length
								})]
							}),
							column.status === "to do" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
								className: "mb-3 flex gap-2",
								onSubmit: (event) => {
									event.preventDefault();
									onCreate();
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "sr-only",
										htmlFor: "new-task",
										children: "Название задачи"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										id: "new-task",
										value: title,
										onChange: (event) => setTitle(event.target.value),
										placeholder: "Новая задача",
										maxLength: 180,
										disabled: pending,
										className: "min-h-11 min-w-0 flex-1 rounded-full border border-line bg-card px-4 text-sm outline-none"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "submit",
										disabled: pending,
										className: "min-h-11 shrink-0 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-40",
										children: "Добавить"
									})
								]
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-1 flex-col gap-3",
								children: [column.tasks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "px-2 py-6 text-sm text-muted",
									children: column.status === "done" ? "Сюда попадают закрытые задачи." : "Пусто. Перетащите карточку сюда."
								}) : null, column.tasks.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskCard, {
									task,
									pending,
									editing: editing?.id === task.id ? editing.title : null,
									onDragStart: () => {
										dragId.current = task.id;
									},
									onDragEnd: () => {
										dragId.current = null;
										setOver(null);
									},
									onMove: (status) => requestMove(task, status),
									onDelete: () => void run(() => remove({ data: { id: task.id } })),
									onStartEdit: () => setEditing({
										id: task.id,
										title: task.title
									}),
									onEditChange: (value) => setEditing((current) => current && current.id === task.id ? {
										...current,
										title: value
									} : current),
									onCancelEdit: () => setEditing(null),
									onSaveEdit: () => {
										if (!editing || editing.id !== task.id) return;
										const next = editing.title.trim();
										setEditing(null);
										if (!next || next === task.title) return;
										run(() => rename({ data: {
											id: task.id,
											title: next
										} }));
									}
								}, task.id))]
							})
						]
					}, column.status))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ledger, {
					board,
					pulseId,
					pending,
					onReload: async () => {
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
					}
				})]
			}),
			seal ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-20 grid place-items-center bg-ink/40 p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					role: "dialog",
					"aria-modal": "true",
					"aria-labelledby": "seal-title",
					className: "w-full max-w-md rounded-3xl border border-line bg-card p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-3 grid size-11 place-items-center rounded-full bg-locked text-ink",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, {
								className: "size-5",
								"aria-hidden": true
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							id: "seal-title",
							className: "text-2xl",
							children: "Закрыть задачу?"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-pretty text-muted",
							children: [
								"«",
								seal.title,
								"» попадёт в done. После этого её нельзя перетащить обратно, переименовать или удалить."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 flex flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: pending,
								onClick: () => {
									const task = seal;
									setSeal(null);
									run(() => move({ data: {
										id: task.id,
										status: "done"
									} }));
								},
								className: "min-h-11 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-40",
								children: "Перенести в Done"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setSeal(null),
								className: "min-h-11 rounded-full border border-line bg-card px-4 text-sm font-semibold",
								children: "Оставить"
							})]
						})
					]
				})
			}) : null
		]
	});
}
function TaskCard({ task, pending, editing, onDragStart, onDragEnd, onMove, onDelete, onStartEdit, onEditChange, onCancelEdit, onSaveEdit }) {
	const locked = task.status === "done";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "min-w-0 rounded-2xl border border-line bg-card p-3 " + (task.status === "in progress" ? "border-l-4 border-l-accent" : ""),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start gap-2",
			children: [locked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid size-11 shrink-0 place-items-center text-muted",
				"aria-hidden": true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-4" })
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				draggable: !pending && editing == null,
				"aria-hidden": true,
				onDragStart: (event) => {
					event.dataTransfer.setData("text/plain", String(task.id));
					event.dataTransfer.effectAllowed = "move";
					onDragStart();
				},
				onDragEnd,
				className: "grid size-11 shrink-0 cursor-grab place-items-center text-muted active:cursor-grabbing",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GripVertical, { className: "size-5" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-w-0 flex-1 pt-2",
				children: editing != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: (event) => {
						event.preventDefault();
						onSaveEdit();
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "sr-only",
							htmlFor: `edit-${task.id}`,
							children: "Название"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: `edit-${task.id}`,
							value: editing,
							autoFocus: true,
							maxLength: 180,
							disabled: pending,
							onChange: (event) => onEditChange(event.target.value),
							onKeyDown: (event) => {
								if (event.key === "Escape") onCancelEdit();
							},
							className: "min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm outline-none"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "submit",
								disabled: pending,
								className: "min-h-11 rounded-full bg-accent px-3 text-sm font-semibold text-accent-ink disabled:opacity-40",
								children: "Сохранить"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: onCancelEdit,
								className: "min-h-11 rounded-full border border-line px-3 text-sm font-semibold",
								children: "Отмена"
							})]
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "break-words text-base leading-snug font-semibold",
					children: task.title
				})
			})]
		}), locked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 px-2 text-sm text-muted",
			children: "Закрыта. Изменения запрещены."
		}) : editing != null ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-3 flex flex-wrap gap-2",
			children: [
				targetsFor(task.status).map((status) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: pending,
					onClick: () => onMove(status),
					className: "min-h-11 rounded-full border border-line bg-paper px-3 text-sm font-semibold disabled:opacity-40",
					children: MOVE_LABEL[status]
				}, status)),
				task.status === "in progress" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: pending,
					onClick: onStartEdit,
					className: "min-h-11 rounded-full border border-line bg-paper px-3 text-sm font-semibold disabled:opacity-40",
					children: "Править"
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: pending,
					onClick: onDelete,
					className: "min-h-11 rounded-full border border-danger/30 px-3 text-sm font-semibold text-danger disabled:opacity-40",
					children: "Удалить"
				})
			]
		})]
	});
}
function Ledger({ board, pulseId, pending, onReload }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "min-w-0 rounded-3xl border border-line bg-card p-4 lg:sticky lg:top-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-2xl",
					children: "База"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: [
						sourceLabel(board.source),
						". Запрос прошёл, строк в tasks:",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "tabular-nums",
							children: board.tasks.length
						}),
						"."
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onReload,
					disabled: pending,
					className: "grid size-11 shrink-0 place-items-center rounded-full border border-line disabled:opacity-40",
					"aria-label": "Перечитать из базы",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
						className: "size-4",
						"aria-hidden": true
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-4 font-mono text-xs leading-relaxed text-muted",
				children: [
					"select id, title, status, updated_at",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
					"from tasks order by id;"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 divide-y divide-line border-y border-line",
				children: board.tasks.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "grid grid-cols-[auto_1fr] gap-x-3 py-2 font-mono text-xs",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-muted tabular-nums",
							children: ["#", task.id]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-accent",
							children: task.status
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "col-span-2 break-words text-ink",
							children: task.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "col-span-2 text-muted tabular-nums",
							children: stamp(task.updated_at)
						})
					]
				}, task.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mt-5 font-sans text-sm font-semibold tracking-wide text-ink uppercase",
				children: "Журнал SQL"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "mt-2 flex max-h-96 flex-col gap-3 overflow-auto pr-1",
				children: board.events.map((event) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-2xl border border-line p-3 " + (event.id === pulseId ? "tape-in" : ""),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-baseline justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-xs font-medium text-accent uppercase",
								children: event.action
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-xs text-muted tabular-nums",
								children: stamp(event.created_at)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm",
							children: event.detail
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
							className: "mt-2 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-muted",
							children: event.sql_text
						})
					]
				}, event.id))
			})
		]
	});
}
function Home() {
	const initial = Route.useLoaderData();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Board, { initial });
}
//#endregion
export { Home as component };
