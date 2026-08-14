import fs from "node:fs";
import { inject, isTemplateType } from "./inject.ts";
import { validate } from "./validate.ts";
import { inline } from "./inline.ts";
import { readJSON } from "./io.ts";
import { search } from "./knowledge.ts";

function usage(): void {
  console.error(
    "用法:\n" +
      "  node src/cli.ts create-from-content --type <t> --content <file> --out <file>\n" +
      "  node src/cli.ts validate --type <t> --html <file>\n" +
      "  type: param-visual | branch-story | drag-slot"
  );
}

function parseOpts(args: string[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i]?.replace(/^--/, "");
    o[k] = args[i + 1];
  }
  return o;
}

const [, , cmd, ...rest] = process.argv;
const opts = parseOpts(rest);

if (cmd === "create-from-content") {
  const { type, content, out } = opts;
  if (!isTemplateType(type) || !content || !out) {
    usage();
    process.exit(2);
  }
  let contentObj: unknown;
  try {
    contentObj = readJSON(content);
  } catch (e) {
    console.error("读 content 失败:", (e as Error).message);
    process.exit(1);
  }
  let html: string;
  try {
    html = inject(type, contentObj);
  } catch (e) {
    console.error("inject 失败:", (e as Error).message);
    process.exit(1);
  }
  const v = validate(type, html);
  if (!v.ok) {
    console.error("validate 失败，不写出半成品：\n  " + v.errors.join("\n  "));
    process.exit(1);
  }
  const inl = inline(html);
  if (inl.warnings.length) {
    console.error("inline 警告，不写出：\n  " + inl.warnings.join("\n  "));
    process.exit(1);
  }
  fs.writeFileSync(out, inl.html);
  const report = {
    skill: type,
    type,
    template: `${type}/v1`,
    bytes: inl.bytes,
    contract_ok: true,
    out,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
} else if (cmd === "validate") {
  const { type, html: htmlFile } = opts;
  if (!isTemplateType(type) || !htmlFile) {
    usage();
    process.exit(2);
  }
  const html = fs.readFileSync(htmlFile, "utf8");
  const v = validate(type, html);
  console.log(JSON.stringify(v, null, 2));
  process.exit(v.ok ? 0 : 1);
} else if (cmd === "search") {
  const { query, module, top_k } = opts;
  if (!query || !module) {
    console.error("用法: search --query <q> --module <m> [--top_k n]");
    process.exit(2);
  }
  const res = search(query, module, top_k ? Number(top_k) : 5);
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
} else {
  usage();
  process.exit(2);
}
