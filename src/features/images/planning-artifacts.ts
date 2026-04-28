import fs from "node:fs";
import path from "node:path";
import { getImageAssetDirectory, buildArtifactDateStamp } from "./image-records";
import type { OutlinePlanningResult } from "./outline-planning-types";
import type { TypeSpecificGenerationResult } from "./type-specific-generation-types";
import type { ImageOptions } from "./types";

interface OutlinePlanArtifactInput {
  sourcePath: string;
  inlineMode: ImageOptions["inlineMode"];
  inlineType: ImageOptions["inlineType"];
  style: ImageOptions["style"];
  palette: ImageOptions["palette"];
  llmModel?: string;
  llmBaseUrl?: string;
}

export function getOutlinePlanArtifactPath(vaultBasePath: string, sourcePath: string, date = new Date()): string {
  return path.join(
    getImageAssetDirectory(vaultBasePath, sourcePath).absoluteDir,
    `${buildArtifactDateStamp(date)}-outline.json`,
  );
}

export function writeOutlinePlanArtifact(
  vaultBasePath: string,
  sourcePath: string,
  result: OutlinePlanningResult,
  input: OutlinePlanArtifactInput,
  date = new Date(),
): void {
  const filePath = getOutlinePlanArtifactPath(vaultBasePath, sourcePath, date);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({
    input,
    output: result,
  }, null, 2));
}

export function getTypeSpecificArtifactPath(vaultBasePath: string, sourcePath: string, date = new Date()): string {
  return path.join(
    getImageAssetDirectory(vaultBasePath, sourcePath).absoluteDir,
    `${buildArtifactDateStamp(date)}-type-specific.json`,
  );
}

export function writeTypeSpecificArtifact(
  vaultBasePath: string,
  sourcePath: string,
  result: TypeSpecificGenerationResult,
  date = new Date(),
): void {
  const filePath = getTypeSpecificArtifactPath(vaultBasePath, sourcePath, date);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
}
