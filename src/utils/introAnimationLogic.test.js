import { describe, expect, test } from "vite-plus/test";
import { isIntroProgressDone, isIntroStalled } from "./introAnimationLogic.js";

describe("isIntroProgressDone", () => {
  test("waits for min duration and near-complete progress in normal mode", () => {
    expect(
      isIntroProgressDone({
        ready: true,
        minElapsed: false,
        displayProgress: 100,
        prefersReducedMotion: false,
      }),
    ).toBe(false);

    expect(
      isIntroProgressDone({
        ready: true,
        minElapsed: true,
        displayProgress: 99.4,
        prefersReducedMotion: false,
      }),
    ).toBe(false);

    expect(
      isIntroProgressDone({
        ready: true,
        minElapsed: true,
        displayProgress: 99.6,
        prefersReducedMotion: false,
      }),
    ).toBe(true);
  });

  test("closes immediately when ready in reduced-motion mode", () => {
    expect(
      isIntroProgressDone({
        ready: false,
        minElapsed: true,
        displayProgress: 50,
        prefersReducedMotion: true,
      }),
    ).toBe(false);

    expect(
      isIntroProgressDone({
        ready: true,
        minElapsed: false,
        displayProgress: 10,
        prefersReducedMotion: true,
      }),
    ).toBe(true);
  });
});

describe("isIntroStalled", () => {
  test("detects frozen progress before completion", () => {
    expect(
      isIntroStalled({
        displayProgress: 50,
        lastProgressAt: 1000,
        stallTimeout: 10000,
        now: 10999,
      }),
    ).toBe(false);

    expect(
      isIntroStalled({
        displayProgress: 50,
        lastProgressAt: 1000,
        stallTimeout: 10000,
        now: 11001,
      }),
    ).toBe(true);
  });

  test("does not stall after the line is nearly complete", () => {
    expect(
      isIntroStalled({
        displayProgress: 99,
        lastProgressAt: 0,
        stallTimeout: 1000,
        now: 5000,
      }),
    ).toBe(false);
  });
});
