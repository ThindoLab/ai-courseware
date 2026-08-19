import { createReadToolDefinition, createWriteToolDefinition } from "@earendil-works/pi-coding-agent";
import { knowledgeSearchTool, qaCheckTool } from "../../src/tools.ts";
import { createMatchSampleTool } from "./match-sample.ts";
import { createUseSampleTool } from "./use-sample.ts";
import { createImaSearchTool } from "./ima-search.ts";
import path from "node:path";
import { createDicebearSvgTool, createIconSearchTool, createIconSvgTool } from "./icon-cast.ts";
import { createCastIconTool, createCastSvgTool } from "./cast-lanes.ts";
import { createCastRosterTool, createCastSearchTool, createCastAssetTool } from "./cast-roster.ts";
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
  "cast_roster",
  "cast_search",
  "cast_asset",
  "cast_icon",
  "cast_svg",
  "icon_search",
  "icon_svg",
  "dicebear_svg",
  WEB_SEARCH_TOOL_NAME,
] as const;

export function createInjectedTools(root: string) {
  const persistDir = path.join(root, "output", "cast");
  return [
    createMatchSampleTool(root),
    createUseSampleTool(root),
    createWriteToolDefinition(root),
    createReadToolDefinition(root),
    qaCheckTool,
    knowledgeSearchTool,
    createImaSearchTool(root),
    createCastRosterTool({ root }),
    createCastSearchTool({ root }),
    createCastAssetTool({ root }),
    createCastIconTool({ persistDir }),
    createCastSvgTool({ persistDir }),
    createIconSearchTool(),
    createIconSvgTool({ persistDir }),
    createDicebearSvgTool({ persistDir }),
  ];
}

export { createMatchSampleTool, createUseSampleTool };
export type { MatchResult, MatchVerdict } from "./match-sample.ts";
export { loadPortraits, matchByPortraits, inferTags } from "./match-sample.ts";
