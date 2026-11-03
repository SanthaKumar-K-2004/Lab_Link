import "@testing-library/jest-dom";
import { vi } from "vitest";

// Polyfill window.matchMedia for jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Polyfill ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill scrollTo
window.scrollTo = () => {};

// Mock Supabase client globally
vi.mock("@/integrations/supabase/client", async () => {
  const { mockSupabase } = await import("./mocks/supabaseMock");
  return {
    supabase: mockSupabase,
  };
});
