# wechat-article-obsidian

## 1. 项目定位

- 这是一个 **Obsidian 插件**，不是独立网页应用，也不是第二编辑器。
- 交互形态固定为：
  - 左侧 toolbar icon 打开
  - 右侧 side-panel workbench 展示
- **当前打开的 Markdown 文档是正文真源。**
- 右侧 workbench 是工具台，不是自由编辑器，不要引入第二份正文真源。
- 当前 V1 不扩成：
  - 发布平台
  - 多来源内容工厂
  - 学习闭环系统

## 2. 沟通与输出要求

- 保持直接、清晰、专业、冷静。
- 先讲结论，再讲原因，再讲执行方案。
- 多方案按“推荐方案 / 备选方案 / 不推荐方案”组织。
- 默认说明每个方案的优缺点、适用场景、成本和风险。
- 当方案有明显风险、设计缺陷、维护问题或成本问题时，要明确指出，不要模糊表达。
- 不要讨好，不要输出无信息量的鼓励，不要为了显得全面而堆砌无关内容。
- 可以反驳不合理想法，但要给出结构化理由和更优替代方案。

## 3. 核心行为原则

### 先思考再编码

- 不要静默假设，不要掩盖不确定性。
- 如果存在多种合理解释，要明确说出来，不要私自选一种。
- 如果更简单的路径成立，要明确指出，不要默认走复杂方案。
- 如果关键信息不清楚，先核对上下文；核对后仍不清楚，再提问。

### 简单优先

- 只写解决当前问题所需的最小代码和最小改动。
- 不要添加未请求的能力、抽象、配置或“未来可能有用”的弹性设计。
- 单次使用的逻辑不要为了“通用性”额外抽象。
- 如果 50 行能解决，就不要写成 200 行。

### 手术式修改

- 只改与当前需求直接相关的内容。
- 不要顺手重构无关代码、注释、格式或命名。
- 如果发现无关死代码或设计问题，可以指出，但不要擅自清理。
- 你的每一处变更都应该能直接追溯到当前任务。

### 目标驱动执行

- 把任务转成可验证的目标，不要停留在“改一下”这种模糊表述。
- bugfix 默认先补回归测试，再修实现；如果无法补测试，要明确说明原因。
- 不要把“能跑”说成“已验证”。
- 只有验证链路完成，才能对外声称问题已修复或能力已落地。

### 已完成功能保护

- 对已经完成并可对外使用的功能，默认不得擅自修改或删除其业务逻辑、交互流程、UI 入口或用户可见行为。
- 如果某项改动会改变现有功能的使用方式、按钮入口、弹层流程、返回结果、默认行为或能力边界，必须先明确告知用户，并获得确认后才能实施。
- 如果判断某项现有实现存在设计缺陷、维护问题或需要重做，可以提出替代方案，但在用户明确同意前，只能分析和建议，不能直接改动。
- 只有当用户明确要求以下之一时，才允许对已完成功能做破坏性修改：
  - 下线
  - 删除
  - 重做
  - 调整为“开发中”
  - 用新方案替换旧方案
- bugfix、兼容性修复、明确不改变用户可见行为的内部修复，不受此限制；但如果修复会改变用户体验或交互路径，仍然需要先确认。

## 4. 外部真源与对齐原则

- 本插件的核心能力设计、行为预期、产物形态，默认参考 `ls-wechat-article`。
- 如果当前实现、需求理解或行为预期不确定，优先核对真源，而不是凭记忆或局部代码判断。
- 如果插件当前行为与真源不一致，先核对真源，再决定是复用、适配还是有意偏离。
- 优先核对这些入口：
  - `/Users/frank/Documents/MyStudio/dev/LS-SKILLS/skills/ls-wechat-article/SKILL.md`
  - `/Users/frank/Documents/MyStudio/dev/LS-SKILLS/skills/ls-wechat-article/AGENTS.md`
  - `/Users/frank/Documents/MyStudio/dev/LS-SKILLS/skills/ls-wechat-article/README.md`
  - `/Users/frank/Documents/MyStudio/dev/LS-SKILLS/skills/ls-wechat-article/references/`
  - `/Users/frank/Documents/MyStudio/dev/LS-SKILLS/skills/ls-wechat-article/toolkit/`
  - `/Users/frank/Documents/MyStudio/dev/LS-SKILLS/skills/ls-wechat-article/scripts/`

## 5. 文档读取顺序

- 先读 `AGENTS.md`，理解项目定位、行为原则和硬约束。
- 再读 `/.agents/context/development.md`，理解目录结构、开发方式、Obsidian 宿主约束和验证流程。
- 再读 `/.agents/context/current-state.md`，确认当前已经完成了什么、当前真实行为是什么。
- 需要历史背景时，才读 `/.agents/log/YYYY-MM-DD.md`。
- **不要用开发日志推断当前状态，当前状态以 `current-state.md` 为准。**

## 6. 分支命名规则

- 分支命名格式固定为：`类型/模块-动作-对象`。
- 类型定义：
  - `feature/`：新功能开发
  - `fix/`：普通 Bug 修复
  - `hotfix/`：紧急线上修复
  - `docs/`：文档修改
- `模块-动作-对象` 使用简短、明确的英文小写短语，单词之间用 `-` 连接。
- 示例：
  - `feature/images-add-cover-mode`
  - `fix/publish-handle-manual-cover`
  - `hotfix/wechat-fix-invalid-media-id`
  - `docs/agents-add-branch-rules`

## 7. 发布规则

### 版本号规则

- 本项目是 Obsidian 插件，发布版本必须同时更新：
  - `package.json`
  - `package-lock.json`
  - `manifest.json`
  - `versions.json`
- GitHub Release tag 必须和 `manifest.json` 里的 `version` 完全一致，不加 `v` 前缀。
- `versions.json` 必须新增当前版本到最低 Obsidian 版本的映射，例如：`"1.0.4": "1.6.0"`。
- 普通 Bug 修复默认递增 patch 版本，例如 `1.0.3` -> `1.0.4`。
- 新功能默认递增 minor 版本；破坏性变更才递增 major 版本。

### 正确发布流程

1. 在功能或修复分支完成代码修改。
2. 在同一个分支内先更新版本号：
   - 执行 `npm version <version> --no-git-tag-version` 更新 `package.json` 和 `package-lock.json`。
   - 手动同步 `manifest.json` 的 `version`。
   - 手动在 `versions.json` 追加当前版本。
3. 执行验证：
   - `npm run typecheck`
   - `npm run test`
   - `npm run obsidian:dev`
4. 确认 `main.js`、`styles.css`、`manifest.json` 是当前版本对应的构建结果。
5. 提交代码和版本变更，commit message 使用明确动作，例如：`fix: handle cover image release 1.0.4`。
6. 切回 `main`，先执行 `git pull --ff-only origin main`。
7. 将发布分支合并到 `main`。
8. 推送 `main` 到远端。
9. 在 `main` 当前提交上创建与版本号一致的 tag，例如 `1.0.4`。
10. 推送 tag。
11. 创建 GitHub Release，release name 使用同一个版本号，例如 `1.0.4`。
12. Release 附件必须上传以下独立文件：
   - `manifest.json`
   - `main.js`
   - `styles.css`
13. 发布后检查：
   - GitHub Release 页面存在当前版本。
   - Release tag、release name、`manifest.json.version` 三者一致。
   - Release 附件包含 `manifest.json`、`main.js`、`styles.css`。
   - 远端 `main` 的根目录 `manifest.json` 已是当前版本。

### 禁止的发布顺序

- 不要先把功能合并并 push 到 `main`，再发现需要改版本号并追加 release commit。
- 不要先创建 GitHub Release，再回头修改 `manifest.json` 或 `versions.json`。
- 不要创建带 `v` 前缀的 tag，例如不要用 `v1.0.4`。
- 不要只上传 zip 包；Obsidian 插件市场需要 Release 中存在独立的 `manifest.json`、`main.js`、`styles.css`。
- 不要让 tag 指向的提交和远端 `main` 的版本文件不一致。
- 不要把“本地 Obsidian 已 reload”当作 GitHub Release 或插件市场发布完成。

### Obsidian 插件市场更新规则

- 插件市场更新依赖 GitHub 仓库根目录的 `manifest.json` 和对应版本的 GitHub Release。
- 已收录插件不需要每次向 `obsidian-releases` 提交新增 PR；正常更新版本时，满足 Release 规则即可。
- Obsidian 客户端或市场页面可能存在缓存和审核延迟，不能把“Release 已创建”表述为“用户端已立即可见”。
- 如果插件 id、名称、描述、仓库地址等市场元信息变化，才需要检查 `obsidianmd/obsidian-releases` 中 `community-plugins.json` 是否需要同步。

## 8. 开发日志规则

- 开发日志统一写入 `/.agents/log/`。
- 同一天只保留一个日志文件，文件名固定为 `YYYY-MM-DD.md`。
- 同一天的不同工具共享同一个文件，不再按工具拆文件。
- 每个完成条目使用以下格式：
  - `## 功能或问题标题`
  - `tool: codex` / `tool: claude` / `tool: opencode`
  - 多工具共同完成时，写成 `tool: codex, claude`
- 开发日志只记录“已经完成并可对外说明”的结果，不记录阶段性试错、临时假设和中途修补。
- 同一功能的连续改动默认合并成一个条目；只有当问题域切换，或前一项需求已经完成，才开始新的条目。
- 如果用户需求中途切换，先补记前一项已完成结果，再进入下一项需求。
- 跨天后必须写入新的 `YYYY-MM-DD.md`，不能继续追加到前一天文件。
- 同一需求跨天完成时，在新一天文件中用一句话说明“承接前一日同一问题”，不要回写旧文件。
- 日志压缩按内容触发，不按行数或条目数触发。以下情况应压缩：
  - 同一问题域出现多个相邻或近邻条目
  - 后一个条目明显推翻或取代前一个条目
  - 读者必须连看多段阶段性记录，才能知道最终结果
  - 文件保留了大量试错过程，而不是完成态结果
- 压缩方式是就地合并成最终条目，只保留：
  - 最终结论
  - 最终根因
  - 最终方案
  - 关键验证

## 9. 禁止行为

- 不要脑补 V1 外的强需求。
- 不要把 workbench 做成第二编辑器。
- 不要凭记忆定义产品行为。
- 不要在没有核对真源的前提下调整核心行为。
- 不要把“能跑”说成“已验证”。
- 不要用日志反推当前真实状态。
