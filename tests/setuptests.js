// Silence winston logs during tests to keep output clean
jest.mock("../src/utils/logger", () => ({
  info:  jest.fn(),
  warn:  jest.fn(),
  error: jest.fn(),
  http:  jest.fn(),
  debug: jest.fn(),
}));
