import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],

    // The tests must not depend on whatever happens to be in this developer's
    // .env, so they bring their own settings. MONGODB_URI is a placeholder that
    // is never dialled — tests/setup.ts hands connectDb the throwaway in-memory
    // database instead.
    env: {
      NODE_ENV: "test",
      PORT: "4001",
      MONGODB_URI: "mongodb://127.0.0.1:27017/taskflow-test-placeholder",
      JWT_SECRET: "test-secret-that-is-long-enough-to-pass-the-check",
      JWT_EXPIRES_IN: "7d",
      CORS_ORIGIN: "http://localhost:5173",
    },

    // Starting a MongoDB in memory takes longer than the 5s default on a
    // first run, when the binary still has to be downloaded.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
