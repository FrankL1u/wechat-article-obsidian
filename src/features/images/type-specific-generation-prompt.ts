import type { OutlinePlanningResult } from "./outline-planning-types";

export interface TypeSpecificGenerationRequest {
  system: string;
  user: string;
}

const SYSTEM_PROMPT = `You are an AI Image Prompt Engineer.

CRITICAL RULES:
1. DATA EXTRACTION: You MUST extract REAL numbers, terms, and quotes from the Article Text for the typeSpecific content. NEVER use placeholders like "[insert data]".
2. TEMPLATE: Strictly follow the provided type-specific template structure and output schema for each illustration type.
3. LANGUAGE: All natural-language text inside typeSpecific MUST match the primary language of the Article Text. If the article is in Chinese, return Chinese. If the article is in English, return English. Do NOT translate the article content into another language.
4. OUTPUT BOUNDARY: Return only illustrationId and typeSpecific. Do NOT return frontmatter, style, palette, aspect, globalDefaults, filename, markdown, or any explanation.
5. GLOBAL DEFAULTS: Do NOT include whitespace rules, text style rules, or no-hex-text rules in the output. These will be appended by the program later.

Output JSON only.
Top-level field must be:
- prompts

Each prompts item must contain only:
- illustrationId
- typeSpecific`;

export function buildTypeSpecificGenerationRequest(
  articleContent: string,
  outlineResult: Pick<OutlinePlanningResult, "outline">,
  typeSpecificTemplates: string,
): TypeSpecificGenerationRequest {
  return {
    system: SYSTEM_PROMPT,
    user: [
      "### 1. Article Text",
      '"""',
      articleContent,
      '"""',
      "",
      "### 2. Outline",
      JSON.stringify(outlineResult.outline, null, 2),
      "",
      "### 3. Type-Specific Templates",
      typeSpecificTemplates,
      "",
      "### 4. Task",
      "Generate `typeSpecific` for every illustration in the outline.",
      "",
      "### 5. Output Example",
      "{",
      '  "prompts": [',
      "    {",
      '      "illustrationId": "01",',
      '      "typeSpecific": {',
      '        "title": "LLM Wiki 对比图",',
      '        "layout": "左右对照布局",',
      '        "zones": [',
      '          "Zone 1（左）: 传统 RAG，查询时检索原始文档",',
      '          "Zone 2（右）: 持久 wiki，持续维护结构化知识",',
      '          "Zone 3（中）: 突出长期知识积累的核心差异"',
      "        ],",
      '        "labels": "原始文档, 持久 wiki, 持续维护"',
      "      }",
      "    },",
      "    {",
      '      "illustrationId": "02",',
      '      "typeSpecific": {',
      '        "title": "系统流程图",',
      '        "layout": "自上而下流程",',
      '        "steps": [',
      '          "摄取 - 导入并解析原始资料",',
      '          "查询 - 检索结构化知识节点",',
      '          "检查 - 校验输出质量"',
      "        ],",
      '        "connections": "用自上而下的箭头按顺序连接摄取、查询和检查"',
      "      }",
      "    }",
      "  ]",
      "}",
    ].join("\n"),
  };
}
