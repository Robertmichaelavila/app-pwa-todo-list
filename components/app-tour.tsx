"use client";

import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { tourDriverOptions, visibleTourSteps } from "@/lib/tour";

let activeTour: Driver | undefined;

export function destroyAppTour() {
  activeTour?.destroy();
  activeTour = undefined;
}

export function startAppTour() {
  if (typeof document === "undefined") return;

  const steps = visibleTourSteps(
    (selector) => document.querySelector(selector) !== null,
  );
  if (steps.length === 0) return;

  destroyAppTour();
  activeTour = driver({
    ...tourDriverOptions,
    steps,
  });
  activeTour.drive();
}
