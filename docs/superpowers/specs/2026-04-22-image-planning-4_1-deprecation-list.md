# 4.1 旧链废弃说明

## 已废弃文件

以下文件在 4.1 新链稳定并完成切换后应删除或改为仅保留兼容桥接：

- `src/features/images/planning-model.ts`
- `src/features/images/plan-images.ts`

## 已废弃字段

以下字段属于旧 4.1 位置规划语义，不再作为新 4.1 真源：

- 旧 4.1 本地候选位置与本地数量估算相关字段
- 旧 `targets` JSON 返回格式中的：
  - `paragraphExcerpt`
  - `sectionTitle`
  - `promptIntent`
  - `creativeDirection`

这些字段后续只应存在于临时兼容层或旧链删除前的过渡代码里，不应继续作为新 4.1 对外 schema。

## 已废弃描述

以下描述应在新链稳定后从文档和说明里移除：

- “程序先估正文图数量”
- “程序先组织候选位置，再让模型从候选里选”
- “旧 4.1 返回 `targets`，再由程序做主要解析”

## 替代关系

- `planning-model.ts`
  -> `outline-planning-prompt.ts` + `outline-planning-model.ts`

- `plan-images.ts`
  -> `outline-planning-model.ts` + `outline-planning-adapter.ts`

- 旧 plan cache
  -> `outline-planning-cache.ts`

- 旧 4.1 `targets` 返回结构
  -> `OutlinePlanningResult`

## 删除时机

以下顺序固定：

1. 先完成新 4.1 单轮 outline 链
2. 先完成测试切换
3. 先确认 workbench 主路径已走新链
4. 再删除旧 4.1 文件、旧字段、旧描述

当前状态：

- 新链已接入
- 旧链仍保留，作为过渡与回退来源
- 本文档用于后续集中删除，不在本轮提前清理
