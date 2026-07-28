/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';

// Mock ResizeObserver for Carbon components
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock localStorage for tests
const store: Record<string, string> = {};
Object.defineProperty(global, 'localStorage', {
    value: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    },
    writable: true,
});
