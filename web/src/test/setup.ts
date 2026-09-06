import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Unmounts whatever the last test rendered. Without it a query like
// "find the Sign in button" can match the previous test's leftover copy and
// pass for the wrong reason.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Radix components measure the element they are attached to, and jsdom has no
// layout engine — every box is 0x0 and these APIs simply do not exist. Without
// them a Select or a Dialog throws on render, which would look like a broken
// component rather than a missing browser feature.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as typeof window.matchMedia;
}

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
