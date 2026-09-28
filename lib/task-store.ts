import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  assertTask,
  sortTasks,
  TaskNotFoundError,
  type Task,
} from "@/lib/tasks";

interface TaskDatabase extends DBSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: { "by-createdAt": number };
  };
}

export type TaskRepository = {
  list: () => Promise<Task[]>;
  add: (task: Task) => Promise<void>;
  save: (task: Task) => Promise<void>;
  remove: (id: string) => Promise<void>;
  close: () => void;
};

const TASK_DB_NAME = "tarefas";
const TASK_DB_VERSION = 1;

export async function openTaskRepository(
  databaseName = TASK_DB_NAME,
): Promise<TaskRepository> {
  const database: IDBPDatabase<TaskDatabase> = await openDB<TaskDatabase>(
    databaseName,
    TASK_DB_VERSION,
    {
      upgrade(db) {
        if (db.objectStoreNames.contains("tasks")) return;
        const store = db.createObjectStore("tasks", { keyPath: "id" });
        store.createIndex("by-createdAt", "createdAt");
      },
    },
  );

  return {
    async list() {
      const tasks = await database.getAll("tasks");
      return sortTasks(tasks);
    },
    async add(task) {
      assertTask(task);
      await database.add("tasks", task);
    },
    async save(task) {
      assertTask(task);
      const existing = await database.get("tasks", task.id);
      if (!existing) {
        throw new TaskNotFoundError(task.id);
      }
      await database.put("tasks", task);
    },
    async remove(id) {
      const existing = await database.get("tasks", id);
      if (!existing) {
        throw new TaskNotFoundError(id);
      }
      await database.delete("tasks", id);
    },
    close() {
      database.close();
    },
  };
}
