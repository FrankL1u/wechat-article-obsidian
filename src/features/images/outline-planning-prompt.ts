import type { ImageOptions } from "./types";
import { readArticleTypes } from "./article-types";

export interface OutlinePlanningRequest {
  system: string;
  user: string;
}

const SYSTEM_PROMPT = `You are an inline illustration planning assistant for long-form articles.

Your job is not to summarize the article. Your job is to produce a final, executable inline illustration outline based on the article content.

LANGUAGE RULE:
- All natural-language fields in the output MUST match the primary language of the article.
- If the article is in Chinese, return Chinese for articleType, coreArguments, locationText, excerpt, sectionTitle, purpose, and visualContent.
- If the article is in English, return English for those fields.
- Do NOT translate article excerpts, section titles, or semantic descriptions into another language.

You must complete all of the following in one response:
1. Identify 2-5 core arguments in the article.
2. Find all strong candidate positions for inline illustrations.
3. Filter the final retained positions according to the requested illustration density.
4. Convert the final result into the required JSON structure.

Candidate selection rules:
- Prioritize core arguments and major idea shifts.
- Favor abstract concepts that benefit from visual explanation.
- Favor data comparisons that fit charts or comparison visuals.
- Favor processes, workflows, and operational sequences that fit flowcharts or step visuals.
- Favor architecture, frameworks, systems, and relationships that fit framework diagrams.

Article type classification rules:
- Before selecting image positions, classify the article into exactly one articleType.
- articleType must be selected only from the provided article_types list.
- Use the article's overall topic, intent, and signals to determine the best matching type.
- Do not invent new article types.

Position distribution balance rules:
- The final retained positions should, when possible, cover the front, middle, and later parts of the article instead of clustering near the beginning.
- If middle or later sections contain candidates of similar or near-similar value, prefer the positions that improve distribution balance.
- Only allow the final result to concentrate mainly in the front part of the article when the later part truly lacks suitable illustration opportunities.

Exclusion rules:
- Do not place illustrations in decorative or generic passages.
- Do not place illustrations in greetings, transitions, conclusions, calls to action, or other low-information sections.
- When the article uses metaphor, do not illustrate the literal scene. Illustrate the underlying concept instead.
- Do not produce multiple illustration positions that repeat the same information.

Illustration density rules:
- minimal: keep only the most essential 1-2 positions
- balanced: keep 3-5 positions that cover the main sections
- per-section: keep at least 1 position for each major section
- rich: keep as many high-value positions as practical, usually 6 or more

Inline type rules:
- If the user specifies a fixed inline type, use that type for every retained position.
- If the user selects "auto", determine the most suitable inlineType for each retained position.
- inlineType must be one of:
  "infographic", "scene", "flowchart", "comparison", "framework", "timeline"

Position definitions:
- section: a section heading and its following content block, usually an H2 or H3 in Markdown.
- paragraph: a natural paragraph inside a section, excluding the heading itself.
- If positionType is "section", the image will be inserted after that section heading.
- If positionType is "paragraph", the image will be inserted after that paragraph.

Position example:

Article Title (H1)

## 1. Background  <-- Section 1
This is the first paragraph introducing the project motivation. <-- Paragraph 1

This is the second paragraph describing the current pain point. <-- Paragraph 2
![Illustration 1](imgs/01-infographic-pain-points.png)  <-- Insert after Paragraph 2

This is the third paragraph introducing the solution. <-- Paragraph 3

## 2. Core Architecture  <-- Section 2
### 2.1 Data Flow  <-- Sub-section 2.1
This is the first paragraph explaining how data moves from client to server. <-- Paragraph 1
![Illustration 2](imgs/02-flowchart-data-flow.png)  <-- Insert after Paragraph 1 in Sub-section 2.1

This is the second paragraph explaining middleware filtering logic. <-- Paragraph 2

### 2.2 Storage Strategy  <-- Sub-section 2.2
This is the first paragraph comparing SQL and NoSQL. <-- Paragraph 1
![Illustration 3](imgs/03-comparison-storage.png)  <-- Insert after Paragraph 1 in Sub-section 2.2

## 3. Conclusion  <-- Section 3
This is the first paragraph reviewing the core points. <-- Paragraph 1

This is the second paragraph discussing future direction. <-- Paragraph 2
![Illustration 4](imgs/04-scene-future.png)  <-- Insert at the end

Output requirements:
- Every illustration position must map precisely to a section or paragraph in the article.
- Return JSON only.
- Do not return reasoning.
- Do not return candidate lists.
- Do not return any extra explanation.
- outline must be returned in article order.
- The top-level JSON fields must be:
  - articleType
  - coreArguments
  - imageCount
  - outline
- articleType must be one of the provided article types.
- Each outline item must contain:
  - id
  - positionType
  - locationText
  - excerpt
  - sectionTitle
  - purpose
  - inlineType
  - visualContent
- Field constraints:
  - positionType must be either "section" or "paragraph"
  - paragraph items must provide excerpt
  - section items must use an empty string for excerpt

If the article structure is weak or implicit, infer reasonable sections from the article semantics and use practical paragraph-level positioning.`;

function describeInlineMode(mode: ImageOptions["inlineMode"]): string {
  switch (mode) {
    case "minimal":
      return "minimal";
    case "balanced":
      return "balanced";
    case "per-section":
      return "per-section";
    case "rich":
      return "rich";
    default:
      return "balanced";
  }
}

function buildPromptArticleTypes(): string {
  const definitions = readArticleTypes();
  return JSON.stringify({
    article_types: definitions.article_types.map((item) => ({
      type: item.type,
      name: item.name,
      signals: item.signals,
    })),
  }, null, 2);
}

export function buildOutlinePlanningRequest(markdown: string, options: ImageOptions): OutlinePlanningRequest {
  return {
    system: SYSTEM_PROMPT,
    user: [
      "Generate the final inline illustration outline JSON for the following article.",
      "",
      "Configuration:",
      `- Illustration density: ${describeInlineMode(options.inlineMode)}`,
      `- Inline illustration type: ${options.inlineType}`,
      "",
      "Article Types:",
      buildPromptArticleTypes(),
      "",
      "Article Text:",
      markdown,
      "",
      "Output Example:",
      "{",
      '  "articleType": "Methodology",',
      '  "coreArguments": [',
      '    "[Core argument 1 in article language]",',
      '    "[Core argument 2 in article language]"',
      "  ],",
      '  "imageCount": 2,',
      '  "outline": [',
      "    {",
      '      "id": "illustration-1",',
      '      "positionType": "paragraph",',
      '      "locationText": "[Precise paragraph location in article language]",',
      '      "excerpt": "[Verbatim or near-verbatim excerpt in article language]",',
      '      "sectionTitle": "[Section title in article language]",',
      '      "purpose": "[Why this illustration is useful, in article language]",',
      '      "inlineType": "framework",',
      '      "visualContent": "[Concrete visual description in article language]"',
      "    },",
      "    {",
      '      "id": "illustration-2",',
      '      "positionType": "section",',
      '      "locationText": "[Precise section location in article language]",',
      '      "excerpt": "",',
      '      "sectionTitle": "[Section title in article language]",',
      '      "purpose": "[Why this illustration is useful, in article language]",',
      '      "inlineType": "flowchart",',
      '      "visualContent": "[Concrete visual description in article language]"',
      "    }",
      "  ]",
      "}",
    ].join("\n"),
  };
}
