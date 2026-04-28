import esbuild from "esbuild";
import fs from "fs";

await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "main.js",
  external: ["obsidian", "electron", "@codemirror/state", "@codemirror/view", "@codemirror/commands"],
  format: "cjs",
  platform: "node",
  target: "es2022",
  sourcemap: false,
  plugins: [
    {
      name: "css-loader",
      setup(build) {
        build.onLoad({ filter: /\.css$/ }, async (args) => {
          const css = await fs.promises.readFile(args.path, "utf8");
          return { contents: `module.exports = ${JSON.stringify(css)};`, loader: "js" };
        });

        build.onLoad({ filter: /\.jsonc$/ }, async (args) => {
          const raw = await fs.promises.readFile(args.path, "utf8");
          const text = raw
            .split("\n")
            .filter((line) => !line.trimStart().startsWith("//"))
            .join("\n");
          return { contents: `module.exports = ${text};`, loader: "js" };
        });
      },
    },
  ],
});
