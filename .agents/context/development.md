# 开发说明

## 1. 开发目标与基本原则

- 默认做最小改动，不顺手大重构。
- bugfix 默认先补回归测试，再修实现；如果无法补测试，要明确说明原因。
- 不要复制一套与真源脱节的主题、图片或内容规则。
- 默认遵循现有代码风格和目录边界，不为了“更优雅”重写局部架构。

## 2. 目录结构与职责边界

- `src/features/`
  - 业务能力层
  - `images/`：图片规划、生成、结果组装
  - `output/`：新文章输出、路径解析
  - `preview/`：Markdown -> 预览 HTML
  - `themes/`：主题数据与加载
  - `workbench/`：右侧工作台 React 组件、本地状态、工作台样式源文件
- `src/platform/`
  - 平台桥接层
  - `obsidian/`：ItemView、插件宿主桥接、Vault IO、当前文档获取、工作台初始化
- `src/types/`
  - 全局共享类型
- `src/features/workbench/styles/`
  - 工作台样式源文件
  - 当前包含：`design-tokens.css`、`primitives.css`、`shell.css`、`author-chip.css`、`dropdown.css`、`preview.css`、`buttons.css`、`overlays.css`、`smart-image.css`、`theme-selector.css`、`settings-tab.css`
- `styles.css`
  - 插件根样式入口
  - 构建后的聚合产物
  - 不要把新的业务样式直接堆回这里
- `tests/`
  - 单元测试与回归测试
- `scripts/`
  - 构建辅助脚本，例如样式同步和 Obsidian build-copy-reload
- 当前已下线独立 web 调试链，不再保留 `index.html`、`vite.config.ts`、`src/platform/web/` 和 `dist/`。

## 3. 开发约束

- 不要把 Obsidian 宿主逻辑写进 `src/features/workbench/*`。
- 不要把业务逻辑塞回 `ItemView`。
- 不要在 `platform/obsidian` 里实现主题规则、图片规则或文章输出规则。
- 不要把简单 UI 调整扩成大范围重构。
- 不要把样式重新堆成一个巨大的根 `styles.css`。
- 不要在插件里复制一套与 `ls-wechat-article` 脱节的规则。

## 4. 默认开发工作流

1. 先探索上下文，再修改代码。
2. 默认先补测试或确认现有测试覆盖，再修实现。
3. 本地验证顺序固定为：
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`
   - `npm run obsidian:dev`
4. 如果只改文档，不需要跑前端构建链，但要做静态核对并说明未跑自动化验证。

## 5. Obsidian 插件开发相关信息

- 默认开发知识库：
  - `/Users/frank/Library/Mobile Documents/iCloud~md~obsidian/Documents/frank-vault`
- 默认插件目录：
  - `/Users/frank/Library/Mobile Documents/iCloud~md~obsidian/Documents/frank-vault/.obsidian/plugins/wechat-article-obsidian`
- 优先使用统一脚本：
  - `npm run obsidian:build`
  - `npm run obsidian:copy`
  - `npm run obsidian:reload`
  - `npm run obsidian:dev`
- `npm run obsidian:dev` 默认执行 `build -> copy -> reload`。
- `reload` 通过目标知识库中的 `obsidian-local-rest-api` 调用 `app:reload`，不要再手工找命令面板。
- 工作台初始化不能只依赖 active leaf 变化事件。
- 必须同时处理两种启动场景：
  - 当前已有 Markdown 文档
  - 当前没有任何 Markdown 文档
- 无文档状态下，页面也要完整初始化，不能只剩空白容器。
- iframe / 预览层不要依赖脆弱 DOM 假设。
- 宿主问题优先看 `obsidian dev:errors`，不要凭感觉猜。
- 后续测试不要使用 computer use；代理默认只负责 build / copy / reload 和本地自动验证，用户自己手动测试 Obsidian 界面。

## 6. 验证标准

- 只有 `typecheck`、`test`、`build`、`obsidian:dev` 走完，才能说“已验证”。
- 如果因为任务性质只做了静态核对或局部验证，要明确写“已修改，但未完成完整验证链”。
- 用户手测 UI 不替代代理的本地自动验证；代理不能跳过自己的验证链。
