import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
export const TEMPLATES_DIR = path.join(ROOT, "templates");

export function readTemplate(type: string, name: string): string {
  return fs.readFileSync(path.join(TEMPLATES_DIR, type, "v1", name), "utf8");
}

export function readJSON(p: string): unknown {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
