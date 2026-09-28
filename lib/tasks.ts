export const TITLE_MAX_LENGTH = 140;

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
};

export type TaskValidationReason = "empty" | "too-long" | "invalid";

export class TaskValidationError extends Error {
  readonly reason: TaskValidationReason;

  constructor(reason: TaskValidationReason) {
    super(reason);
    this.name = "TaskValidationError";
    this.reason = reason;
  }
}

export class TaskNotFoundError extends Error {
  readonly id: string;

  constructor(id: string) {
    super(`Task not found: ${id}`);
    this.name = "TaskNotFoundError";
    this.id = id;
  }
}

export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ");
}

export function createTask(
  title: string,
  options?: { id?: string; now?: number },
): Task {
  const normalized = normalizeTitle(title);
  if (normalized.length === 0) {
    throw new TaskValidationError("empty");
  }
  if (normalized.length > TITLE_MAX_LENGTH) {
    throw new TaskValidationError("too-long");
  }

  return {
    id: options?.id ?? crypto.randomUUID(),
    title: normalized,
    completed: false,
    createdAt: options?.now ?? Date.now(),
  };
}

export function assertTask(value: unknown): asserts value is Task {
  if (typeof value !== "object" || value === null) {
    throw new TaskValidationError("invalid");
  }

  const candidate = value as Partial<Task>;
  if (typeof candidate.id !== "string" || candidate.id.length === 0) {
    throw new TaskValidationError("invalid");
  }
  if (typeof candidate.title !== "string") {
    throw new TaskValidationError("invalid");
  }
  if (normalizeTitle(candidate.title).length === 0) {
    throw new TaskValidationError("empty");
  }
  if (normalizeTitle(candidate.title) !== candidate.title) {
    throw new TaskValidationError("invalid");
  }
  if (candidate.title.length > TITLE_MAX_LENGTH) {
    throw new TaskValidationError("too-long");
  }
  if (typeof candidate.completed !== "boolean") {
    throw new TaskValidationError("invalid");
  }
  if (
    typeof candidate.createdAt !== "number" ||
    !Number.isFinite(candidate.createdAt) ||
    candidate.createdAt < 0
  ) {
    throw new TaskValidationError("invalid");
  }
}

export function toggleTask(task: Task): Task {
  return { ...task, completed: !task.completed };
}

export function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((left, right) => {
    if (left.completed !== right.completed) {
      return left.completed ? 1 : -1;
    }
    return right.createdAt - left.createdAt;
  });
}

export function taskErrorMessage(error: unknown): string {
  if (error instanceof TaskValidationError) {
    if (error.reason === "empty") {
      return "Escreva uma tarefa antes de adicionar.";
    }
    if (error.reason === "too-long") {
      return "Use no máximo 140 caracteres.";
    }
    return "Essa tarefa não pode ser salva.";
  }
  if (error instanceof TaskNotFoundError) {
    return "Essa tarefa não está mais na lista.";
  }
  return "Não foi possível salvar a tarefa neste aparelho.";
}
