import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  server: {
    port: 8080,
    host: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
