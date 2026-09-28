import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertTask,
  createTask,
  sortTasks,
  taskErrorMessage,
  TaskNotFoundError,
  TaskValidationError,
  TITLE_MAX_LENGTH,
  toggleTask,
  type Task,
} from "./tasks";

describe("createTask", () => {
  it("should create an open task when the title is valid", () => {
    const task = createTask("  Comprar   café  ", { id: "task-1", now: 10 });

    assert.deepEqual(task, {
      id: "task-1",
      title: "Comprar café",
      completed: false,
      createdAt: 10,
    });
  });

  it("should assign different ids when two tasks are created", () => {
    const first = createTask("Uma");
    const second = createTask("Outra");

    assert.notEqual(first.id, second.id);
    assert.equal(first.completed, false);
    assert.equal(second.completed, false);
  });

  it("should reject the title when it is empty", () => {
    assert.throws(() => createTask(""), TaskValidationError);
    assert.throws(() => createTask("   \n\t  "), (error: unknown) => {
      assert.ok(error instanceof TaskValidationError);
      assert.equal(error.reason, "empty");
      return true;
    });
  });

  it("should accept the title when it has the maximum length", () => {
    const title = "a".repeat(TITLE_MAX_LENGTH);

    const task = createTask(title, { id: "max", now: 0 });

    assert.equal(task.title, title);
    assert.equal(task.createdAt, 0);
  });

  it("should reject the title when it is longer than the maximum", () => {
    const title = "a".repeat(TITLE_MAX_LENGTH + 1);

    assert.throws(() => createTask(title), (error: unknown) => {
      assert.ok(error instanceof TaskValidationError);
      assert.equal(error.reason, "too-long");
      return true;
    });
  });
});

describe("assertTask", () => {
  const valid: Task = {
    id: "task-1",
    title: "Comprar café",
    completed: false,
    createdAt: 0,
  };

  it("should accept a stored task when every field is valid", () => {
    assert.doesNotThrow(() => assertTask(valid));
  });

  it("should reject the value when it is null", () => {
    assert.throws(() => assertTask(null), (error: unknown) => {
      assert.ok(error instanceof TaskValidationError);
      assert.equal(error.reason, "invalid");
      return true;
    });
  });

  it("should reject the value when it is undefined", () => {
    assert.throws(() => assertTask(undefined), (error: unknown) => {
      assert.ok(error instanceof TaskValidationError);
      assert.equal(error.reason, "invalid");
      return true;
    });
  });

  it("should reject the task when the title is only whitespace", () => {
    assert.throws(
      () => assertTask({ ...valid, title: "   " }),
      (error: unknown) => {
        assert.ok(error instanceof TaskValidationError);
        assert.equal(error.reason, "empty");
        return true;
      },
    );
  });

  it("should reject the task when createdAt is negative", () => {
    assert.throws(
      () => assertTask({ ...valid, createdAt: -1 }),
      (error: unknown) => {
        assert.ok(error instanceof TaskValidationError);
        assert.equal(error.reason, "invalid");
        return true;
      },
    );
  });
});

describe("toggleTask", () => {
  it("should mark the task completed when it is open", () => {
    const task = createTask("Ligar", { id: "task-1", now: 5 });

    const toggled = toggleTask(task);

    assert.equal(task.completed, false);
    assert.equal(toggled.completed, true);
    assert.equal(toggled.id, "task-1");
    assert.equal(toggled.title, "Ligar");
  });

  it("should reopen the task when it is completed", () => {
    const task = toggleTask(createTask("Ligar", { id: "task-1", now: 5 }));

    const reopened = toggleTask(task);

    assert.equal(reopened.completed, false);
  });
});

describe("sortTasks", () => {
  it("should return an empty list when there are no tasks", () => {
    assert.deepEqual(sortTasks([]), []);
  });

  it("should keep open tasks before completed tasks and newer tasks first", () => {
    const olderOpen = createTask("Antiga", { id: "old", now: 1 });
    const newerOpen = createTask("Nova", { id: "new", now: 3 });
    const completed = toggleTask(createTask("Feita", { id: "done", now: 4 }));
    const original = [completed, olderOpen, newerOpen];

    const sorted = sortTasks(original);

    assert.deepEqual(
      sorted.map((task) => task.id),
      ["new", "old", "done"],
    );
    assert.equal(original[0]?.id, "done");
  });
});

describe("taskErrorMessage", () => {
  it("should explain an empty title when validation fails", () => {
    const message = taskErrorMessage(new TaskValidationError("empty"));

    assert.equal(message, "Escreva uma tarefa antes de adicionar.");
  });

  it("should explain the length limit when the title is too long", () => {
    const message = taskErrorMessage(new TaskValidationError("too-long"));

    assert.equal(message, "Use no máximo 140 caracteres.");
  });

  it("should explain a missing task when it was already removed", () => {
    const message = taskErrorMessage(new TaskNotFoundError("task-1"));

    assert.equal(message, "Essa tarefa não está mais na lista.");
  });

  it("should explain a storage failure when the database rejects the write", () => {
    const message = taskErrorMessage(new Error("database closed"));

    assert.equal(message, "Não foi possível salvar a tarefa neste aparelho.");
  });
});
