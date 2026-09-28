import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { IDBFactory } from "fake-indexeddb";
import { openTaskRepository } from "./task-store";
import {
  createTask,
  TaskNotFoundError,
  TaskValidationError,
  toggleTask,
} from "./tasks";

describe("task repository", { concurrency: 1 }, () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it("should return an empty list when no tasks were saved", async () => {
    const repository = await openTaskRepository("tarefas-empty");

    const tasks = await repository.list();

    assert.deepEqual(tasks, []);
    repository.close();
  });

  it("should return the task when it is added", async () => {
    const repository = await openTaskRepository("tarefas-add");
    const task = createTask("Comprar café", { id: "task-1", now: 10 });

    await repository.add(task);
    const tasks = await repository.list();

    assert.deepEqual(tasks, [task]);
    repository.close();
  });

  it("should keep tasks when the repository is opened again", async () => {
    const task = createTask("Comprar café", { id: "task-1", now: 10 });
    const first = await openTaskRepository("tarefas-reopen");
    await first.add(task);
    first.close();

    const second = await openTaskRepository("tarefas-reopen");
    const tasks = await second.list();

    assert.deepEqual(tasks, [task]);
    second.close();
  });

  it("should mark the task completed when it is saved toggled", async () => {
    const repository = await openTaskRepository("tarefas-toggle");
    const task = createTask("Ligar", { id: "task-1", now: 10 });
    await repository.add(task);

    await repository.save(toggleTask(task));
    const tasks = await repository.list();

    assert.equal(tasks[0]?.completed, true);
    assert.equal(tasks[0]?.title, "Ligar");
    repository.close();
  });

  it("should remove the task when it is deleted", async () => {
    const repository = await openTaskRepository("tarefas-delete");
    const task = createTask("Apagar", { id: "task-1", now: 10 });
    await repository.add(task);

    await repository.remove(task.id);
    const tasks = await repository.list();

    assert.deepEqual(tasks, []);
    repository.close();
  });

  it("should reject the write when the title is empty", async () => {
    const repository = await openTaskRepository("tarefas-invalid");

    await assert.rejects(
      () =>
        repository.add({
          id: "task-1",
          title: "   ",
          completed: false,
          createdAt: 1,
        }),
      (error: unknown) => {
        assert.ok(error instanceof TaskValidationError);
        assert.equal(error.reason, "empty");
        return true;
      },
    );
    assert.deepEqual(await repository.list(), []);
    repository.close();
  });

  it("should reject the write when the task is null", async () => {
    const repository = await openTaskRepository("tarefas-null");

    const invalid = null as unknown as Parameters<typeof repository.add>[0];
    await assert.rejects(() => repository.add(invalid), (error: unknown) => {
      assert.ok(error instanceof TaskValidationError);
      assert.equal(error.reason, "invalid");
      return true;
    });
    repository.close();
  });

  it("should reject the update when the task does not exist", async () => {
    const repository = await openTaskRepository("tarefas-missing");
    const task = createTask("Sumiu", { id: "missing", now: 1 });

    await assert.rejects(() => repository.save(task), TaskNotFoundError);
    await assert.rejects(() => repository.remove("missing"), TaskNotFoundError);
    repository.close();
  });

  it("should reject the write when the database is closed", async () => {
    const repository = await openTaskRepository("tarefas-closed");
    const task = createTask("Comprar café", { id: "task-1", now: 1 });
    repository.close();

    await assert.rejects(() => repository.add(task));
  });

  it("should list open tasks before completed tasks when both exist", async () => {
    const repository = await openTaskRepository("tarefas-order");
    const openTask = createTask("Aberta", { id: "open", now: 1 });
    const doneTask = toggleTask(createTask("Feita", { id: "done", now: 5 }));
    await repository.add(doneTask);
    await repository.add(openTask);

    const tasks = await repository.list();

    assert.deepEqual(
      tasks.map((task) => task.id),
      ["open", "done"],
    );
    repository.close();
  });
});
