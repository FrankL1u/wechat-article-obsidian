# 当前状态快照

## 1. 当前定位

- 当前项目是一个 Obsidian 插件，交互形态固定为左侧图标打开、右侧 side-panel workbench 展示。
- 当前 workbench 的职责是：
  - 预览公众号样式
  - 生成正文配图
  - 管理当前文档的图片与主题
  - 提供插件设置
- 当前打开的 Markdown 文档仍是唯一正文真源；workbench 不承载自由编辑。
- 封面旧生成链已下线；当前执行的是新封面 prompt JSON 与封面图片生成链。

## 2. 已完成能力

- 右侧工作台基础框架
- 左侧 icon 打开工作台
- 当前文档预览
- 无文档状态占位
- 预览主题切换
- 图片参数面板（风格、配色、封面类型、正文图数量、正文图类型）
  - 智能配图设置弹层使用左侧标题、右侧标签式下拉菜单展示；下拉触发器为图标 + 中文文字 + 箭头，无边框
- 正文图位置规划（LLM）
- 正文图内容生成（LLM）
- 最终 prompt JSON 拼装
- 正文图生成与插回原文
- 单图删除
- 单图重新生成弹层（仅正文图）
- 单封面重新生成弹层
- 封面 prompt 请求构造
- 封面 prompt 模型调用层
- 封面图片生成与 image-record 落盘服务层
- 智能配图入口触发封面生成
- 封面生成后回写到 Markdown 顶部
- 输出目录设置项与路径解析
- 样式分层与 design tokens
- web dev 入口与 Obsidian host 入口分离
- build -> copy -> reload 工作流

## 3. 当前关键行为

- 正文图主链只走：
  - 正文图位置规划
  - 正文图内容生成
  - prompt 拼装
  - 生图
  - 回写
- 不再保留旧的程序定位 fallback、旧正文图 prompt-builder、旧封面生成链。
- 每次点击“智能配图 -> 生成”都会重跑正文图位置规划，不读取本地 outline 缓存作为执行入口。
- 文章运行产物统一写入：
  - `/_wechat-article-assets/<文章哈希目录>/`
- 文章目录下当前会保存：
  - `YYYY-M-D-outline.json`
  - `YYYY-M-D-type-specific.json`
  - `YYYY-M-D-image-record-<imageId>.json`
  - `wao-cover-YYYY-M-D-<imageId>.<ext>`
  - `wao-inline-YYYY-M-D-<imageId>.png`
- `outline.json` 现在保存 `input + output`，但不保存正文全文。
- 位置规划 / 内容生成 prompt 已统一改为英文规则文本；自然语言输出内容必须跟随文章主语言，中文文章不应再被翻译成英文。
- 正文图单张重新生成：
  - 点击右上角按钮先弹出工作台内页面
  - 弹层只允许调整风格和配色
  - 插件生成的正文图真源为对应的 `image-record-<imageId>.json`
  - 插件生成的正文图在风格/配色不变时复用原 prompt 再次生图
  - 插件生成的正文图在风格/配色变化时只改对应 prompt JSON 中的 style / palette 后再生图
  - 非插件生成的 Markdown 图片一律按正文图处理，也显示重新生成按钮
  - 非插件生成的正文图会基于当前图片附近正文上下文生成单张正文图 prompt，写入新的 image-record，并只替换当前图片路径
  - 每次重新生成都会创建新的 `imageId`、新的图片文件和新的 image-record，不覆盖旧文件
- 单图重新生成时只给当前图片加灰色半透明遮罩和转圈动画，不再把整页切成全局 loading。
- 预览层现在能够识别真实 Obsidian 资源 URL，包括带 query 的托管图片地址，图片控件可以正确注入。
- 预览层清理 runtime wrapper 时不再误删正文里的真实图片节点。
- 单图重生成后的宿主刷新会保留当前预览上下文，不再因为 workbench 叶子激活而把整块预览图片刷掉。
- 单封面重新生成当前支持：
  - 点击封面右上角重新生成按钮打开同一个重生成弹层
  - 弹层显示 7 个字段：风格、配色、封面类型、情绪、字体风格、层级、比例
  - 弹层字段使用左侧标题、右侧标签式下拉菜单展示；标题带冒号并右对齐；下拉触发器为图标 + 中文文字 + 箭头，无边框
  - 封面类型和情绪在同一行，字体风格和层级在同一行，比例放在最后；同一行的第二个选项不显示额外标签，紧跟前一个选项
  - 弹层下拉项使用中文展示，提交和落盘仍使用内部英文 key
  - 默认读取对应封面 `image-record` 中的原始 prompt JSON 和封面维度
  - 未改参数时复用原 prompt 再次生图
  - 改参数时只 patch 对应封面 prompt 字段后再次生图
  - 每次重新生成都会创建新的 `imageId`、新的封面图片文件和新的 image-record，不覆盖旧文件
  - Markdown 中只替换当前封面图片路径
- 分栏 resize 后，预览滚动容器使用专用 scroll root，并保留滚动位置恢复逻辑。
- 封面 prompt 模型调用层当前只生成最终 cover prompt JSON：
  - 智能配图入口只提供封面类型、风格、配色
  - mood 默认 `balanced`
  - font 默认 `clean`
  - text level 默认 `title-only`
  - aspect 默认 `2.35:1`
  - 模型返回必须是 `type: "cover"` 的 JSON
- 封面图片生成服务层当前可以把最终 cover prompt JSON 转成封面图片文件和 `image-record`：
  - 文件写入 `/_wechat-article-assets/<文章哈希目录>/`
  - 文件名使用 `wao-cover-YYYY-M-D-<imageId>.<ext>`
  - 记录文件使用 `YYYY-M-D-image-record-<imageId>.json`
  - `providerIdentity.sizeKind` 固定为 `cover`
- 智能配图入口现在会在 `coverType !== none` 时触发封面生成：
  - 先基于正文图位置规划结果中的 `articleType` 生成封面 prompt JSON
  - 再生成封面图片文件和 `image-record`
  - 封面会作为托管图片插入 Markdown 顶部
  - 封面会随 Markdown 扫描进入预览图片列表
  - 当用户只生成封面、不生成正文图时，封面会正常回写，不再要求必须存在正文图定位
  - 封面生成失败不会阻断正文图生成，会提示“封面生成失败，已继续生成正文图”
- 微信发布入口当前会调用微信草稿箱接口：
  - 使用选中的本地客户配置作为作者和微信凭据
  - 通过 Obsidian `requestUrl` 访问微信 API，避免宿主 `fetch` 兼容问题
  - 草稿标题从 Markdown 真源标题提取，不再从预览 HTML fallback 为“未命名文章”
  - 草稿正文会移除预览外壳、正文 H1 和已上传为 `thumb_media_id` 的封面图片，避免正文顶部出现“封面图”
  - 发布失败时在 workbench 状态和 Obsidian Notice 中显示微信接口错误
- 顶部作者区当前显示头像图标 + 作者名，无边框，作者名使用主色；当 Markdown frontmatter 包含发布时间时，会在作者后展示发布时间、阅读数、点赞数，未发布文章不展示该组数据。
- 底部“关于作者”入口当前打开 workbench 级覆盖层，不进入预览 iframe；内容从当前 vault 根目录的 `关于作者文案.md` 读取并渲染，支持文档内 Obsidian 图片嵌入。
- 底部帮助入口当前展示简版使用指南，按“核心用法 / 排版风格 / 封面处理 / 正文图处理 / 草稿发布 / AI 支持”分类；分类标题加粗，正文换行与标题后的内容起点对齐。
- 模型设置页支持 LLM / 图片生成超时配置，默认均为 60 秒。
- 模型设置页支持 LLM API 端点标签切换，选项为 OpenAI 兼容和 Anthropic 兼容；OpenAI 兼容走 `<base>/chat/completions`，Anthropic 兼容走 `<base>/v1/messages`。
- 模型设置页支持分别测试 LLM 和图片生成配置；LLM 测试跟随当前端点兼容模式，图片测试会实际发起一次最小生图请求但不落盘。

## 4. 未完成 / 明确不做

- 正文生成工作流
- 生成新 Markdown 文章工作流
- 热点 / MCP / 知识库选题
- 微信发布的完整生产级兜底链路
- 学习回写
- 多源内容输入
- 完整宿主自动化验证
- 当前 V1 不扩成：
  - 第二编辑器
  - 发布平台
  - 多来源内容工厂
  - 学习闭环系统

## 5. 关键边界

- Markdown 是唯一正文真源。
- workbench 是工具台，不是第二编辑器。
- 核心能力设计、行为预期、产物形态默认参考 `ls-wechat-article`。
- 不要在插件内复制一套与真源脱节的主题、图片或内容规则。
- 正文图重新生成当前只允许改风格和配色，不处理正文图类型切换。
- 封面重新生成当前允许改风格、配色、封面类型、情绪强度、画幅比例、字体风格、文字层级。

## 6. 真源入口

- `/Users/frank/Documents/MyStudio/dev/LS-SKILLS/skills/ls-wechat-article/SKILL.md`
- `/Users/frank/Documents/MyStudio/dev/LS-SKILLS/skills/ls-wechat-article/AGENTS.md`
- `/Users/frank/Documents/MyStudio/dev/LS-SKILLS/skills/ls-wechat-article/README.md`
- `/Users/frank/Documents/MyStudio/dev/LS-SKILLS/skills/ls-wechat-article/references/`
- `/Users/frank/Documents/MyStudio/dev/LS-SKILLS/skills/ls-wechat-article/toolkit/`
- `/Users/frank/Documents/MyStudio/dev/LS-SKILLS/skills/ls-wechat-article/scripts/`
