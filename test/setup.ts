// This file is used to set up the testing environment for Jest

// Import Jest DOM extensions
import '@testing-library/jest-dom';

// Add the types for jest-dom
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveStyle(style: string | Record<string, unknown>): R;
    }
  }
}

// Mock window methods that are not implemented in JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Suppress console warnings during tests
const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  // Filter out specific warnings that we expect during tests
  if (
    args[0] && 
    (args[0].includes('TextFit property perfectFit has been removed') ||
     args[0].includes('Can not process element without height') ||
     args[0].includes('Can not process element without width'))
  ) {
    return;
  }
  originalConsoleWarn(...args);
}; 