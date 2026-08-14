import { createReadToolDefinition, createWriteToolDefinition } from "@earendil-works/pi-coding-agent";
import { knowledgeSearchTool, qaCheckTool } from "../../src/tools.ts";
import { createMatchSampleTool } from "./match-sample.ts";
import { createUseSampleTool } from "./use-sample.ts";
import { createImaSearchTool } from "./ima-search.ts";
import { WEB_SEARCH_TOOL_NAME } from "./web-search.ts";

/** 与 README「当前默认注入」保持一致 */
export const INJECTED_TOOL_NAMES = [
  "match_sample",
  "use_sample",
  "write",
  "read",
  "qa_check",
  "knowledge_search",
  "ima_search",
  WEB_SEARCH_TOOL_NAME,
] as const;

export function createInjectedTools(root: string) {
  return [
    createMatchSampleTool(root),
    createUseSampleTool(root),
    createWriteToolDefinition(root),
    createReadToolDefinition(root),
    qaCheckTool,
    knowledgeSearchTool,
    createImaSearchTool(root),
  ];
}

export { createMatchSampleTool, createUseSampleTool };
export type { MatchResult, MatchVerdict } from "./match-sample.ts";
export { loadPortraits, matchByPortraits, inferTags } from "./match-sample.ts";
