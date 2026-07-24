/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';

// Mock ResizeObserver for Carbon components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
