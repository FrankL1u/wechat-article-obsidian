import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const manifest = JSON.parse(readFileSync(path.join(projectRoot, "manifest.json"), "utf8"));

const DEFAULT_VAULT_PATH =
  "/Users/frank/Library/Mobile Documents/iCloud~md~obsidian/Documents/liusir2035-KB";
const vaultPath = process.env.WAO_VAULT_PATH ?? DEFAULT_VAULT_PATH;
const pluginId = manifest.id;
const pluginDir =
  process.env.WAO_PLUGIN_DIR ?? path.join(vaultPath, ".obsidian", "plugins", pluginId);
const localRestSettingsPath = path.join(
  vaultPath,
  ".obsidian",
  "plugins",
  "obsidian-local-rest-api",
  "data.json",
);
const vaultName = path.basename(vaultPath);

const command = process.argv[2] ?? "build-copy-reload";

try {
  switch (command) {
    case "build":
      runBuild();
      break;
    case "copy":
      copyPluginBundle();
      break;
    case "reload":
      await reloadObsidian();
      break;
    case "build-copy":
      runBuild();
      copyPluginBundle();
      break;
    case "build-copy-reload":
      runBuild();
      copyPluginBundle();
      await reloadObsidian();
      break;
    default:
      throw new Error(
        `Unknown command "${command}". Use one of: build, copy, reload, build-copy, build-copy-reload.`,
      );
  }
} catch (error) {
  console.error(`[obsidian-plugin-dev] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

function runBuild() {
  runCommand("npm", ["run", "build"]);
}

function copyPluginBundle() {
  mkdirSync(pluginDir, { recursive: true });
  for (const file of ["manifest.json", "main.js", "styles.css"]) {
    cpSync(path.join(projectRoot, file), path.join(pluginDir, file));
  }
  console.log(`[obsidian-plugin-dev] Copied plugin bundle to ${pluginDir}`);
}

async function reloadObsidian() {
  const settings = readLocalRestSettings();
  if (!settings) {
    throw new Error(
      `Missing Local REST API settings at ${localRestSettingsPath}. Cannot reload Obsidian automatically.`,
    );
  }

  await ensureVaultIsReachable(vaultName, settings);
  await postCommand(settings, "app:reload");
  console.log("[obsidian-plugin-dev] Triggered Obsidian reload via Local REST API");
}

function readLocalRestSettings() {
  if (!existsSync(localRestSettingsPath)) {
    return null;
  }

  const raw = JSON.parse(readFileSync(localRestSettingsPath, "utf8"));
  return {
    port: raw.port,
    apiKey: raw.apiKey,
  };
}

async function ensureVaultIsReachable(vault, settings) {
  try {
    await getCommands(settings);
    return;
  } catch {
    runCommand("open", [`obsidian://open?vault=${encodeURIComponent(vault)}`]);
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await wait(1000);
    try {
      await getCommands(settings);
      return;
    } catch {
      // retry
    }
  }

  throw new Error("Obsidian Local REST API is not reachable after attempting to open the vault.");
}

function getCommands(settings) {
  return requestJson(settings, "/commands/", "GET");
}

function postCommand(settings, commandId) {
  return requestJson(settings, `/commands/${encodeURIComponent(commandId)}/`, "POST");
}

function requestJson(settings, requestPath, method) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "127.0.0.1",
        port: settings.port,
        path: requestPath,
        method,
        rejectUnauthorized: false,
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
        },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if ((res.statusCode ?? 500) >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${body || "request failed"}`));
            return;
          }
          resolve(body ? JSON.parse(body) : null);
        });
      },
    );

    req.on("error", reject);
    req.end();
  });
}

function runCommand(bin, args) {
  const result = spawnSync(bin, args, {
    cwd: projectRoot,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${bin} ${args.join(" ")}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
