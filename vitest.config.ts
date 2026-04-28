import { defineConfig } from "vitest/config";
import path from "node:path";
import fs from "node:fs";

function jsoncLoader() {
  return {
    name: "jsonc-loader",
    transform(_: string, id: string) {
      if (!id.endsWith(".jsonc")) return null;
      const raw = fs.readFileSync(id, "utf8");
      const text = raw
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("//"))
        .join("\n");
      return {
        code: `export default ${text};`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [jsoncLoader()],
  resolve: {
    alias: {
      obsidian: path.resolve(__dirname, "tests/mocks/obsidian.ts"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
