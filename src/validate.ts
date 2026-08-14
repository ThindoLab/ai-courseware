import { readTemplate } from "./io.ts";
import { extractConfig, type TemplateType } from "./inject.ts";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const REQUIRED_SELECTORS: Record<TemplateType, string[]> = {
  "param-visual": ['id="widget-config"', 'id="stage"', "data-param", 'id="conclusion"', 'id="btn-reset"'],
  "branch-story": ['id="widget-config"', 'id="feedback"', "data-choice", 'id="btn-restart"'],
  "drag-slot": ['id="widget-config"', "data-slot", "data-token", 'id="btn-check"', 'id="btn-reset"'],
};

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function checkSchema(content: Record<string, unknown>, schema: any): string[] {
  const errors: string[] = [];
  const req: string[] = (schema && schema.required) || [];
  req.forEach((k) => {
    if (!(k in content)) errors.push(`missing required: ${k}`);
  });
  const props = (schema && schema.properties) || {};
  for (const k of Object.keys(content)) {
    if (!props[k]) continue;
    const want = props[k].type;
    if (!want) continue;
    const got = typeOf(content[k]);
    const numOk = want === "number" || want === "integer";
    if (numOk) {
      if (typeof content[k] !== "number") errors.push(`${k}: expect ${want}, got ${got}`);
    } else if (want === "array") {
      if (!Array.isArray(content[k])) errors.push(`${k}: expect array, got ${got}`);
    } else if (want === "object") {
      if (typeOf(content[k]) !== "object") errors.push(`${k}: expect object, got ${got}`);
    } else if (want === "string") {
      if (typeof content[k] !== "string") errors.push(`${k}: expect string, got ${got}`);
    } else if (want === "boolean") {
      if (typeof content[k] !== "boolean") errors.push(`${k}: expect boolean, got ${got}`);
    }
  }
  return errors;
}

export function validate(type: TemplateType, html: string): ValidationResult {
  const errors: string[] = [];
  for (const sel of REQUIRED_SELECTORS[type]) {
    if (!html.includes(sel)) errors.push(`缺少选择器: ${sel}`);
  }
  let config: unknown = null;
  try {
    config = extractConfig(html);
  } catch (e) {
    errors.push((e as Error).message);
  }
  if (config !== null) {
    const schema = JSON.parse(readTemplate(type, "schema.json"));
    errors.push(...checkSchema(config as Record<string, unknown>, schema));
  }
  return { ok: errors.length === 0, errors };
}
