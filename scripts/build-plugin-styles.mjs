import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const styleFiles = [
  "src/features/workbench/styles/design-tokens.css",
  "src/features/workbench/styles/primitives.css",
  "src/features/workbench/styles/shell.css",
  "src/features/workbench/styles/author-chip.css",
  "src/features/workbench/styles/dropdown.css",
  "src/features/workbench/styles/preview.css",
  "src/features/workbench/styles/buttons.css",
  "src/features/workbench/styles/overlays.css",
  "src/features/workbench/styles/smart-image.css",
  "src/features/workbench/styles/theme-selector.css",
  "src/features/workbench/styles/settings-tab.css",
];

const output = styleFiles
  .map((relativePath) => {
    const absolutePath = path.join(projectRoot, relativePath);
    const content = readFileSync(absolutePath, "utf8").trim();
    return `/* ${relativePath} */\n${content}`;
  })
  .join("\n\n");

writeFileSync(path.join(projectRoot, "styles.css"), `${output}\n`, "utf8");
