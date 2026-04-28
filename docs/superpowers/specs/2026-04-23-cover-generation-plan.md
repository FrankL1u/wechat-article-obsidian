# 新封面生成能力计划

## 1. 目标

这份文档定义新封面生成能力的实施顺序与数据边界。

当前目标只有两件事：

- 建立可持续维护的封面基础数据
- 基于这些基础数据完成封面生成与单图重生成

不讨论：

- 正文图位置规划
- 正文图内容生成
- 微信发布闭环

---

## 2. 总原则

### 2.1 真源

新封面能力默认对齐：

- `/Users/frank/Documents/MyStudio/repo/skills/baoyu-skills/skills/baoyu-cover-image`

其中重点参考：

- `SKILL.md`
- `references/auto-selection.md`
- `references/types.md`
- `references/style-presets.md`

### 2.2 插件侧取舍

插件不照搬整个 skill workflow。

只复用这些能力：

- 封面类型定义
- 封面维度定义
- 自动选择思路
- prompt 落盘思路

不复用：

- `EXTEND.md` 偏好体系
- skill 的命令行交互流程
- 多 backend 交互式选择逻辑

### 2.3 用户可见与程序内部的边界

用户显式选择：

- `coverType`
- `style`
- `palette`

程序内部推导：

- `articleType`
- `mood`
- `font`
- `textLevel`
- `aspect`

默认值：

- `aspect = 2.35:1`
- `textLevel = title-only`

---

## 3. 第一步：建立文章类型基础数据

### 3.1 目标

建立一份文章类型基础数据，供位置规划阶段返回标准化 `articleType`。

### 3.2 数据文件

建议新增：

- `src/features/images/article-types.jsonc`

### 3.3 字段结构

字段统一为：

- `type`
- `name`
- `signals`
- `scenarios`

示例：

```json
{
  "article_types": [
    {
      "type": "Technical",
      "name": "技术",
      "signals": "API, metrics, data, numbers, tech, AI, programming, development, code",
      "scenarios": [
        "Technical architecture",
        "Code analysis",
        "System optimization"
      ]
    }
  ]
}
```

### 3.4 行为要求

- 这份数据是模型分类词典，不是程序关键词硬匹配表。
- 位置规划阶段应注入这份数据，并要求模型从枚举中返回标准化 `articleType`。
- 不允许模型自由生成新的文章类型名。

---

## 4. 第二步：在位置规划中引入文章类型

### 4.1 目标

让位置规划阶段返回标准化 `articleType`。

### 4.2 行为要求

- 在位置规划 prompt 中注入 `article-types`
- 要求模型根据文章整体内容及 `signals / scenarios` 返回标准化 `articleType`
- 当前返回值必须命中基础数据中的 `type`

### 4.3 不采用的方案

不采用：

- 程序自行按 `signals` 做关键词硬匹配

原因：

- 中英文和混合表达不稳定
- 多类型信号冲突时不可控
- 后期维护成本高

---

## 5. 第三步：形成封面维度基础数据

### 5.1 目标

将封面维度全部整理成可读取的基础数据文件。

### 5.2 真源要求

这一层按 `baoyu-cover-image` 的字段定义整理，插件只做最小裁剪。

### 5.3 需要形成的数据

- `cover types`
- `moods`
- `aspects`
- `fonts`
- `text levels`

### 5.4 建议文件

- `src/features/images/cover-types.jsonc`
- `src/features/images/cover-moods.jsonc`
- `src/features/images/cover-aspects.jsonc`
- `src/features/images/cover-fonts.jsonc`
- `src/features/images/cover-text-levels.jsonc`

### 5.5 统一字段

各维度统一使用：

- `type`
- `name`
- `signals`
- `scenarios`

示例：

```json
{
  "cover_types": [
    {
      "type": "conceptual",
      "name": "概念型",
      "signals": "architecture, framework, system, API, technical, model",
      "scenarios": [
        "Technical architecture",
        "Methodology frameworks",
        "System design",
        "Model analysis"
      ]
    }
  ]
}
```

### 5.6 当前封面类型

封面类型直接采用：

- `hero`
- `conceptual`
- `typography`
- `metaphor`
- `scene`
- `minimal`

---

## 6. 第四步：建立文章类型到封面维度的自动匹配规则

### 6.1 目标

让程序根据 `articleType` 自动匹配封面内部参数。

### 6.2 匹配原则

匹配逻辑统一为：

1. 先确定 `articleType`
2. 读取该 `articleType` 的 `scenarios`
3. 再去匹配各封面维度中的 `scenarios`

当前需要自动匹配的维度：

- `mood`
- `font`
- `textLevel`

### 6.3 默认规则

- `aspect = 2.35:1`
- `textLevel = title-only`

### 6.4 第一版匹配实现

第一版先采用最简单规则：

- 同名 `scenario` 命中优先
- 命中数量多者优先
- 未命中时回退默认值

### 6.5 注意事项

- 各维度的 `scenarios` 文案必须尽量复用同一套短语
- 不建议在第一版引入复杂权重系统

---

## 7. 第五步：实现新封面生成能力

### 7.1 目标

基于基础数据与自动匹配结果，生成新的封面 prompt 并执行生图。

### 7.2 输入

用户显式选择：

- `coverType`
- `style`
- `palette`

程序内部补全：

- `articleType`
- `mood`
- `font`
- `textLevel`
- `aspect`

### 7.3 产物要求

封面也必须有独立的最终 prompt 产物，不采用临时字符串拼接后直接调用生图。

建议保持和正文图一致的思路：

- prompt 可落盘
- 生图输入可追溯
- 后续重生成可复用

### 7.4 当前不做

- 封面能力的多 backend 交互式切换
- 命令行式确认流程
- skill 级别的偏好管理

---

## 8. 第六步：实现单封面重新生成

### 8.1 目标

让封面和正文图一样，支持单图重新生成。

### 8.2 交互要求

- 点击封面“重新生成”后，弹出页面
- 页面允许用户调整：
  - `style`
  - `palette`
  - `type`
  - `mood`
  - `aspect`
  - `font`
  - `textLevel`

### 8.3 真源

单封面重新生成的真源是对应封面的 `image-record`

### 8.4 处理规则

参数不变：

- 直接复用原 prompt 再次生图

参数变化：

- 基于原 prompt 只修改对应字段
- 再次生图

每次重新生成都必须：

- 生成新的 `imageId`
- 生成新的图片文件
- 生成新的 `image-record`

不覆盖旧封面文件。

---

## 9. 推荐顺序

1. 建立 `article-types` 基础数据
2. 在位置规划中返回标准化 `articleType`
3. 建立封面维度基础数据
4. 建立 `articleType -> 封面维度` 自动匹配
5. 实现新封面生成能力
6. 实现单封面重新生成

---

## 10. 不推荐方案

### 10.1 程序直接按 `signals` 关键词硬匹配 `articleType`

问题：

- 漂移大
- 中英文混合不稳
- 后续维护差

### 10.2 在 `articleType` 上直接写死 `recommendedMood / recommendedFont`

问题：

- 耦合重
- 字段体系不统一
- 后期扩展困难

### 10.3 把封面类型和正文图类型模板做成同一套结构

问题：

- 两者职责不同
- 会污染正文图模板体系

---

## 11. 当前起点

现在最先要做的不是封面生图代码，而是：

- `article-types.jsonc`
- 封面维度基础数据文件

这两层不先落下来，后续封面自动匹配和封面生成都会退化成临时逻辑。
