import fs from "node:fs";
import path from "node:path";
import type { Skill } from "@earendil-works/pi-coding-agent";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCAN_DIRS: { dir: string; source: "builtin" | "creator" }[] = [
  { dir: path.join(ROOT, "skills"), source: "builtin" },
  { dir: path.join(ROOT, "skills", "creator"), source: "creator" },
];

export const VALID_TYPES = ["param-visual", "branch-story", "drag-slot"] as const;
export const VALID_MODULES = [
  "learning-coaching",
  "preschool",
  "safety-life",
  "story-culture",
] as const;

export interface SkillDef {
  name: string;
  description: string;
  type: string;
  module: string;
  license: string;
  author?: string;
  filePath: string;
  baseDir: string;
  source: "builtin" | "creator";
  valid: boolean;
  errors: string[];
}

function parseFrontmatter(md: string): Record<string, string> {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (/^\s/.test(line)) continue; // 跳过嵌套/列表行
    const mm = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.+)$/);
    if (mm) out[mm[1]] = mm[2].trim();
  }
  return out;
}

function validateDef(fm: Record<string, string>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!fm.name) errors.push("缺 name");
  if (!fm.type) errors.push("缺 type");
  else if (!VALID_TYPES.includes(fm.type as any)) errors.push(`type 非法: ${fm.type}`);
  if (!fm.module) errors.push("缺 module");
  else if (!VALID_MODULES.includes(fm.module as any)) errors.push(`module 非法: ${fm.module}`);
  return { valid: errors.length === 0, errors };
}

export function loadSkills(): SkillDef[] {
  const defs: SkillDef[] = [];
  for (const { dir, source } of SCAN_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (source === "builtin" && (entry.name === "creator" || entry.name === "frontend-design")) continue;
      const filePath = path.join(dir, entry.name, "SKILL.md");
      if (!fs.existsSync(filePath)) continue;
      const md = fs.readFileSync(filePath, "utf8");
      const fm = parseFrontmatter(md);
      const { valid, errors } = validateDef(fm);
      defs.push({
        name: fm.name || entry.name,
        description: fm.description || "",
        type: fm.type || "",
        module: fm.module || "",
        license: fm.license || "free-share",
        author: fm.author,
        filePath,
        baseDir: path.join(dir, entry.name),
        source,
        valid,
        errors,
      });
    }
  }
  return defs;
}

/** 转为 Agent 可加载的 Skill[]（仅 valid 且 type 合法者）。 */
export function skillsToAgentSkills(defs: SkillDef[]): Skill[] {
  return defs
    .filter((d) => d.valid && VALID_TYPES.includes(d.type as any))
    .map((d) => ({
      name: d.name,
      description: d.description,
      filePath: d.filePath,
      baseDir: d.baseDir,
      source: "custom" as const,
    }));
}

/** 按 name 查 type（供 resolveType 用）。 */
export function typeByName(registry: SkillDef[], name?: string): string | undefined {
  if (!name) return undefined;
  return registry.find((d) => d.name === name && d.valid)?.type;
}
