"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { PwaStatus } from "@/components/pwa-status";
import {
  openTaskRepository,
  type TaskRepository,
} from "@/lib/task-store";
import {
  createTask,
  normalizeTitle,
  sortTasks,
  taskErrorMessage,
  TITLE_MAX_LENGTH,
  toggleTask,
  type Task,
} from "@/lib/tasks";

const LOAD_ERROR = "Não foi possível abrir as tarefas salvas neste aparelho.";

export function TodoApp() {
  const repositoryRef = useRef<TaskRepository | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [title, setTitle] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    openTaskRepository()
      .then(async (repository) => {
        if (!active) {
          repository.close();
          return;
        }
        repositoryRef.current = repository;
        const stored = await repository.list();
        if (active) setTasks(stored);
      })
      .catch(() => {
        if (active) setLoadError(LOAD_ERROR);
      });

    return () => {
      active = false;
      repositoryRef.current?.close();
      repositoryRef.current = null;
    };
  }, [reloadKey]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    let task: Task;
    try {
      task = createTask(title);
    } catch (error: unknown) {
      setFormError(taskErrorMessage(error));
      return;
    }

    const repository = repositoryRef.current;
    if (!repository) {
      setFormError("As tarefas ainda estão carregando.");
      return;
    }

    setTitle("");
    setTasks((current) => sortTasks([...(current ?? []), task]));
    void repository.add(task).catch((error: unknown) => {
      setTasks((current) => (current ?? []).filter((item) => item.id !== task.id));
      setTitle(task.title);
      setFormError(taskErrorMessage(error));
    });
  }

  function handleToggle(task: Task) {
    const repository = repositoryRef.current;
    if (!repository) return;
    const next = toggleTask(task);
    setFormError(null);
    setTasks((current) =>
      sortTasks((current ?? []).map((item) => (item.id === task.id ? next : item))),
    );
    void repository.save(next).catch((error: unknown) => {
      setTasks((current) =>
        sortTasks((current ?? []).map((item) => (item.id === task.id ? task : item))),
      );
      setFormError(taskErrorMessage(error));
    });
  }

  function handleDelete(task: Task) {
    const repository = repositoryRef.current;
    if (!repository) return;
    setFormError(null);
    setTasks((current) => (current ?? []).filter((item) => item.id !== task.id));
    void repository.remove(task.id).catch((error: unknown) => {
      setTasks((current) => sortTasks([...(current ?? []), task]));
      setFormError(taskErrorMessage(error));
    });
  }

  const openTasks = tasks?.filter((task) => !task.completed) ?? [];
  const completedTasks = tasks?.filter((task) => task.completed) ?? [];
  const normalizedLength = normalizeTitle(title).length;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="pt-6">
        <p className="text-sm tracking-[0.18em] text-accent uppercase">Neste aparelho</p>
        <h1 className="mt-2 font-display text-5xl tracking-tight">Tarefas</h1>
        <p className="mt-3 max-w-sm text-muted">
          Salvas neste aparelho. Dá para criar, concluir e excluir sem internet.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="task-title">
          Nova tarefa
        </label>
        <input
          id="task-title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setFormError(null);
          }}
          placeholder="O que você precisa fazer?"
          autoComplete="off"
          enterKeyHint="done"
          className="h-12 w-full min-w-0 rounded-full border border-line bg-surface px-4 text-base outline-none placeholder:text-muted/70 sm:flex-1"
        />
        <button
          type="submit"
          className="h-12 shrink-0 rounded-full bg-accent px-5 font-medium text-accent-ink"
        >
          Adicionar
        </button>
      </form>
      {normalizedLength > 100 ? (
        <p
          className={`mt-2 text-right text-xs ${normalizedLength > TITLE_MAX_LENGTH ? "text-danger" : "text-muted"}`}
        >
          {normalizedLength}/{TITLE_MAX_LENGTH}
        </p>
      ) : null}
      {formError ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      {loadError ? (
        <div className="mt-10">
          <p role="alert" className="text-danger">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoadError(null);
              setTasks(null);
              setReloadKey((value) => value + 1);
            }}
            className="mt-4 h-12 rounded-full border border-line px-5"
          >
            Tentar de novo
          </button>
        </div>
      ) : tasks === null ? (
        <p className="mt-10 text-muted">Carregando tarefas…</p>
      ) : tasks.length === 0 ? (
        <p className="mt-10 text-lg text-muted">Nenhuma tarefa ainda.</p>
      ) : (
        <div className="mt-8 space-y-8">
          <TaskGroup
            title="Em aberto"
            tasks={openTasks}
            empty="Nada em aberto."
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
          {completedTasks.length > 0 ? (
            <TaskGroup
              title="Concluídas"
              tasks={completedTasks}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ) : null}
        </div>
      )}

      <PwaStatus />
    </main>
  );
}

function TaskGroup({
  title,
  tasks,
  empty,
  onToggle,
  onDelete,
}: {
  title: string;
  tasks: Task[];
  empty?: string;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  return (
    <section>
      <h2 className="text-sm tracking-[0.14em] text-muted uppercase">
        {title}
        <span className="ml-2 text-foreground">{tasks.length}</span>
      </h2>
      {tasks.length === 0 && empty ? (
        <p className="mt-3 text-muted">{empty}</p>
      ) : (
        <ul className="mt-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 border-b border-line py-3"
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={task.completed}
                aria-label={
                  task.completed
                    ? `Reabrir ${task.title}`
                    : `Concluir ${task.title}`
                }
                onClick={() => onToggle(task)}
                className={`flex size-8 shrink-0 items-center justify-center rounded-full border ${task.completed ? "border-accent bg-accent text-accent-ink" : "border-line bg-transparent"}`}
              >
                {task.completed ? <CheckIcon /> : null}
              </button>
              <span
                className={`min-w-0 flex-1 text-base leading-6 ${task.completed ? "text-muted line-through" : ""}`}
              >
                {task.title}
              </span>
              <button
                type="button"
                onClick={() => onDelete(task)}
                aria-label={`Excluir ${task.title}`}
                className="shrink-0 text-sm text-danger"
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
      <path
        d="M3.2 8.2 6.3 11.2 12.8 4.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
