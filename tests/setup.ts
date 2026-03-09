import "@testing-library/jest-dom";

// Mock matchMedia for Sonner/Radix
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// JSDOM lacks a real canvas implementation; stub enough for libs that probe it.
// @ts-expect-error - test environment global
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({}));

// Some browser-only libs expect Worker to exist.
// @ts-expect-error - test environment global
globalThis.Worker = class Worker {
  constructor() {}
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
};

// Avoid importing heic2any's worker implementation in tests.
vi.mock("heic2any", () => ({
  default: vi.fn(async ({ blob }: { blob: Blob }) => blob),
}));

