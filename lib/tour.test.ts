import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tourDriverOptions, visibleTourSteps } from "./tour";

const selectors = [
  "#tour-intro",
  "#task-title",
  "#tour-add",
  "#tour-list",
  "#tour-status",
];

describe("visibleTourSteps", () => {
  it("should keep every step when each target is rendered", () => {
    const steps = visibleTourSteps(() => true);

    assert.deepEqual(
      steps.map((step) => step.element),
      selectors,
    );
  });

  it("should omit a step when its element is not rendered", () => {
    const steps = visibleTourSteps((selector) => selector !== "#tour-list");

    assert.equal(
      steps.some((step) => step.element === "#tour-list"),
      false,
    );
    assert.equal(steps.length, selectors.length - 1);
  });

  it("should return no steps when nothing is rendered", () => {
    assert.deepEqual(visibleTourSteps(() => false), []);
  });

  it("should describe each step in short Portuguese", () => {
    const steps = visibleTourSteps(() => true);

    for (const step of steps) {
      assert.equal(typeof step.popover?.title, "string");
      assert.equal(typeof step.popover?.description, "string");
      assert.ok((step.popover?.title?.length ?? 0) > 0);
      assert.ok((step.popover?.description?.length ?? 0) > 0);
      assert.ok((step.popover?.description?.length ?? 0) <= 80);
    }
  });
});

describe("tourDriverOptions", () => {
  it("should show animated progress in Portuguese", () => {
    assert.equal(tourDriverOptions.animate, true);
    assert.equal(tourDriverOptions.showProgress, true);
    assert.equal(tourDriverOptions.progressText, "{{current}} de {{total}}");
    assert.equal(tourDriverOptions.nextBtnText, "Próximo");
    assert.equal(tourDriverOptions.prevBtnText, "Anterior");
    assert.equal(tourDriverOptions.doneBtnText, "Concluir");
  });
});
