# 正文图 Prompt Construction（4.2）

## 1. 目的

这份文档只定义一件事：

- 正文图 Prompt 在 `4.2` 阶段如何构造

不讨论：

- 位置如何选择
- 图片如何真正生成
- Markdown 如何插回文章

这些分别属于 `4.1`、生图执行层、插入层。

---

## 2. 总原则

`4.2` 的目标不是重新决定“画哪里”，而是把 `4.1` 已经确定好的正文图位置大纲，转换成最终可执行的 Prompt 文件。

结论：

- `4.2` 采用 **LLM 生成，程序约束** 的模式
- LLM 负责按模板写出每张图的 Prompt 内容
- 程序负责提供输入、模板、规则、校验和落盘

### 2.1 职责边界

LLM 负责：

- 根据单条或整批 `outline` 结果生成 Prompt 文件内容
- 按指定 `inlineType` 使用对应模板
- 结合原文真实内容填写模板段落
- 结合风格和配色规则写出 `STYLE` / `COLORS`

程序负责：

- 提供 `4.1` 输出
- 提供原文全文
- 提供风格规则、配色规则、全局规则
- 提供输出格式模板
- 校验返回结构
- 保存为 Prompt 文件

LLM 不负责：

- 决定画几张
- 决定画在哪
- 修改 `inlineType`
- 改写位置语义

---

## 3. 输入来源

`4.2` 输入由 5 部分组成：

### 3.1 文章全文

用途：

- 提取真实术语
- 提取真实步骤
- 提取真实对比项
- 提取真实结构节点

### 3.2 `4.1` 返回的 `outline`

每个位置至少包含：

- `id`
- `positionType`
- `locationText`
- `excerpt`
- `sectionTitle`
- `purpose`
- `inlineType`
- `visualContent`

这些字段是 `4.2` 的来源语义真源。

### 3.3 风格规则

来自当前所选 `style` 对应的规则文件。

用途：

- 规定线条
- 规定背景
- 规定质感
- 规定文字气质
- 规定人物表现方式

### 3.4 配色规则

来自当前 palette，或 style 的默认配色。

用途：

- 指定背景色
- 指定主色 / 辅色 / 强调色
- 提供语义颜色

### 3.5 全局规则

固定通用约束，包括：

- 留白
- 简洁构图
- 背景简洁
- 防色值渲染
- 非写实人像
- 文本少而清晰
- 比例要求

---

## 4. 输出形式

`4.2` 一次性返回整批 Prompt 文件内容。

返回格式：

```json
{
  "prompts": [
    {
      "illustrationId": "01",
      "type": "framework",
      "filename": "01-framework-llm-wiki-core.md",
      "frontmatter": {},
      "body": "..."
    }
  ]
}
```

### 4.1 文件格式

单个 Prompt 文件最终保存为：

- `md + YAML frontmatter + body`

这点对齐 `baoyu`。

### 4.2 frontmatter

frontmatter 至少包含：

- `illustration_id`
- `type`
- `style`
- `palette`
- `position_type`
- `location_text`
- `excerpt`
- `section_title`
- `purpose`
- `visual_content`

这些字段中，以下属于来源语义字段，不能被 LLM 改写含义：

- `position_type`
- `location_text`
- `excerpt`
- `section_title`
- `purpose`
- `visual_content`

### 4.3 body

body 直接是最终 Prompt Markdown 文本。

不是：

- JSON
- 自由散文
- 解释说明

body 必须严格按 `inlineType` 对应模板组织。

---

## 5. Type-Specific 模板

以下模板段落名直接对齐 `baoyu` 真文档，不自创额外字段名。

### 5.1 `infographic`

```text
TITLE: ...
LAYOUT: ...
ZONES:
- ...
- ...
LABELS: ...
COLORS: ...
STYLE: ...
ASPECT: 16:9
```

### 5.2 `scene`

```text
TITLE: ...
FOCAL POINT: ...
ATMOSPHERE: ...
MOOD: ...
COLOR TEMPERATURE: ...
STYLE: ...
ASPECT: 16:9
```

### 5.3 `flowchart`

```text
TITLE: ...
LAYOUT: ...
STEPS:
1. ...
2. ...
CONNECTIONS: ...
STYLE: ...
ASPECT: 16:9
```

### 5.4 `comparison`

```text
TITLE: ...
LEFT SIDE:
- ...
- ...
RIGHT SIDE:
- ...
- ...
DIVIDER: ...
STYLE: ...
ASPECT: 16:9
```

### 5.5 `framework`

```text
TITLE: ...
STRUCTURE: ...
NODES:
- ...
- ...
RELATIONSHIPS: ...
STYLE: ...
ASPECT: 16:9
```

### 5.6 `timeline`

```text
TITLE: ...
DIRECTION: ...
EVENTS:
- ...
- ...
MARKERS: ...
STYLE: ...
ASPECT: 16:9
```

---

## 6. 内容填充规则

这是 `4.2` 的核心约束。

### 6.1 必须使用文章真实内容

以下段落必须用文章真实内容填充：

- `ZONES`
- `LABELS`
- `STEPS`
- `LEFT SIDE`
- `RIGHT SIDE`
- `NODES`
- `EVENTS`
- `RELATIONSHIPS`

允许使用的内容包括：

- 原文术语
- 原文数字
- 原文比例
- 原文步骤
- 原文对比项
- 原文结构节点

### 6.2 禁止占位符

禁止：

- `[insert data]`
- `[step 1]`
- `[node name]`
- `[metric]`
- `[quote]`

### 6.3 禁止编造

不得加入文章中不存在的：

- 数据
- 指标
- 事实
- 术语
- 关系

---

## 7. 风格与配色注入

### 7.1 风格注入

`STYLE` 段必须体现当前 style 的视觉语言：

- 线条
- 质感
- 阴影
- 背景
- 文字风格
- 人物表现方式

### 7.2 配色注入

`COLORS` 段必须体现当前 palette 或默认配色：

- 背景色
- 主色
- 辅色
- 强调色
- 颜色语义

如果指定了 palette：

- palette 覆盖 style 默认颜色

如果未指定 palette：

- 使用 style 内置颜色

### 7.3 防色值渲染

颜色名和 hex 值只作渲染指导，不能被画成图中文字。

---

## 8. 全局规则

每张 body 末尾必须附加以下通用约束：

```text
Clean composition with generous white space. Simple or no background.
Color values (#hex) and color names are rendering guidance only — do NOT display color names, hex codes, or palette labels as visible text in the image.
Human figures: simplified stylized silhouettes or symbolic representations, not photorealistic.
Text should be large and prominent with handwritten-style fonts. Keep minimal, focus on keywords.
```

---

## 9. 设计判断

### 推荐方案

- `4.2` 使用 LLM 生成整批 Prompt
- 程序提供模板和规则
- 每张图一个 `.md` Prompt 文件
- frontmatter 放来源语义
- body 严格按类型模板写

### 备选方案

- LLM 只生成 body
- frontmatter 由程序单独拼

优点：

- 更稳

缺点：

- 跟当前“整批返回 prompts[]”设计不完全一致

### 不推荐方案

- 程序纯字符串拼 Prompt
- 或让 LLM 完全自由写 Prompt

问题：

- 前者太僵
- 后者太漂
- 都不符合当前对齐 `baoyu` 的目标

---

## 10. 实施顺序

结论：

- `4.2` 不先定最终 schema
- 先把真源补齐，再定 schema，再接 LLM 与程序拼装

### Step 1：补齐配色真源文件

目标：

- 新增 `palette-definitions.jsonc`
- 让程序能按 palette key 读取统一配色定义

说明：

- 这是当前最先缺失的真源
- 不先补 palette，后面的 `palette` 字段和注入规则都会漂

### Step 2：落 Type-Specific Templates 真源文件

目标：

- 把 6 种正文图模板落成程序真源

建议文件：

- `type-specific-templates.jsonc`

说明：

- 先定模板真源，后面才能准确定义 `typeSpecific`

### Step 3：定 4.2 的最终 JSON schema

目标：

- 定死 LLM 返回结构和程序补全后的最终结构

至少包含：

- `prompts[]`
- `frontmatter`
- `typeSpecific`
- `style`
- `palette`
- `aspect`
- `globalDefaults`

### Step 4：定稿 4.2 的 prompt

目标：

- 定死 `system prompt`
- 定死 `user prompt`
- 定死输出示例

### Step 5：实现 4.2 的 Prompt 输入包组装

目标：

- 从 `4.1 outline + 文章全文 + 风格定义 + 配色定义 + 类型模板`
- 组装成 4.2 调用输入

### Step 6：实现 4.2 的单次 LLM 调用

目标：

- 一次输入整份 `outline`
- 一次返回整批 `prompts[]`

### Step 7：程序补全最终 Prompt JSON

目标：

- 程序统一补：
  - `style`
  - `palette`
  - `aspect`
  - `globalDefaults`

### Step 8：落盘、测试、替换旧链

目标：

- 保存 4.2 产物
- 接入后续生图链
- 补测试
- 输出废弃清单
- 删除旧 4.2 冗余逻辑
