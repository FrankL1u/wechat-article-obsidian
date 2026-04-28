import { useMemo, useRef, useState } from "react";
import { IconButton, PrimaryButton, SecondaryButton, Spinner } from "./components/buttons";
import { AuthorChip } from "./components/author-chip";
import { ImageRegenerateDialog } from "./components/image-regenerate-dialog";
import { PreviewFrame } from "./components/preview-frame";
import { SmartImageSheet } from "./components/smart-image-sheet";
import type { AppState } from "./types";

export interface RegenerateImageOptions {
  style: string;
  palette: string;
  coverType?: string;
  mood?: string;
  aspect?: string;
  font?: string;
  textLevel?: string;
}

interface AppProps {
  state: AppState;
  actions: {
    onThemeChange: (themeKey: string) => void;
    onImageOptionsChange: (partial: Partial<AppState["imageOptions"]>) => void;
    onGenerateImages: () => void;
    onDeleteImage: (imageId: string) => void;
    onRegenerateImage?: (imageId: string, options: RegenerateImageOptions) => void;
    onPublish: () => void;
    onOpenSettings?: () => void;
    onSelectClient?: (clientId: string) => void;
  };
}

const HELP_ITEMS = [
  ["核心用法", "选择文章，切换排版风格、为文章生成封面与正文图、并发布到草稿箱"],
  ["排版风格", "内置多种公众号排版风格，适配技术解析、深度阅读、产品介绍、轻量短文等不同文章气质"],
  ["封面处理", "内置 6 种封面类型，自动适配情绪强度、字体风格、文字层级和画幅比例"],
  ["正文图处理", "内置 5 种正文图类型，自动适配插图位置、正文图数量、视觉结构和配图内容"],
  ["草稿发布", "一键发布文章到公众号草稿箱"],
  ["AI 支持", "可配置 LLM 和生图模型，支持文章分析、配图规划和图片生成"],
];

export function App({ state, actions }: AppProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [authorOpen, setAuthorOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [regenerateImageId, setRegenerateImageId] = useState<string | null>(null);
  const smartBtnRef = useRef<HTMLButtonElement | null>(null);
  const title = useMemo(() => extractTitle(state.previewHtml), [state.previewHtml]);
  const hasLoadedContent = state.sourcePath.trim().length > 0;
  const isGeneratingImages = state.pendingAction === "images";
  const isPublishing = state.pendingAction === "publish";
  const availableClients = state.availableClients ?? [];
  const selectedClientId = state.selectedClientId ?? null;
  const hasSelectedClient = availableClients.length > 0 && Boolean(selectedClientId);
  const disablePrimaryActions = !hasLoadedContent || state.pendingAction !== null;
  const disablePublishAction = disablePrimaryActions || !hasSelectedClient;
  const regenerateImage = regenerateImageId
    ? state.imageResults.find((image) => image.id === regenerateImageId)
    : null;
  const isSubmittingRegenerate = regenerateImage
    ? Boolean(state.regeneratingImageIds?.includes(regenerateImage.id))
    : false;

  return (
    <div className="wechat-article-workbench wao-shell">
      <div className="wao-workbench-topbar">
        <AuthorChip
          clients={availableClients}
          selectedClientId={selectedClientId}
          onOpenSettings={actions.onOpenSettings}
          onSelectClient={actions.onSelectClient}
        />
        {state.articlePublishStats ? <PublishStats stats={state.articlePublishStats} /> : null}
      </div>
      <PreviewFrame
        reloadKey={state.previewRevision}
        html={state.previewHtml}
        themeKey={state.themeKey}
        images={state.imageResults}
        onThemeChange={actions.onThemeChange}
        onDeleteImage={actions.onDeleteImage}
        onRegenerateImage={(imageId) => setRegenerateImageId(imageId)}
        controlsDisabled={!hasLoadedContent}
      />
      <div className="wao-bottom-bar">
        <div className="wao-bottom-bar__left">
          <div
            className="wao-help"
            onMouseEnter={() => setHelpOpen(true)}
            onMouseLeave={() => setHelpOpen(false)}
          >
            <IconButton aria-label="帮助">
              <HelpCircleIcon />
            </IconButton>
            {helpOpen ? (
              <div className="wao-help-popover">
                <strong>使用指南：</strong>
                <ol>
                  {HELP_ITEMS.map(([title, content]) => (
                    <li key={title}>
                      <span className="wao-help-popover__line">
                        <strong className="wao-help-popover__term">{title}：</strong>
                        <span className="wao-help-popover__desc">{content}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
          <SecondaryButton onClick={() => setAuthorOpen(true)}>
            ❤️ 关于作者
          </SecondaryButton>
        </div>
        <div className="wao-bottom-bar__right">
          <button
            ref={smartBtnRef}
            type="button"
            className="wao-smart-btn"
            onClick={() => setSheetOpen(true)}
            disabled={disablePrimaryActions}
          >
            <SmartImageIcon />
            智能配图
          </button>
          <PrimaryButton
            onClick={actions.onPublish}
            disabled={disablePublishAction}
            aria-busy={isPublishing}
          >
            {isPublishing ? (
              <>
                <Spinner />
                发布中
              </>
            ) : (
              "发布"
            )}
          </PrimaryButton>
        </div>
      </div>

      <SmartImageSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        imageOptions={state.imageOptions}
        onOptionsChange={actions.onImageOptionsChange}
        onGenerate={actions.onGenerateImages}
        isGenerating={isGeneratingImages}
        isDisabled={disablePrimaryActions}
        triggerRef={smartBtnRef}
      />
      {regenerateImage ? (
        <ImageRegenerateDialog
          open
          image={regenerateImage}
          isSubmitting={isSubmittingRegenerate}
          onClose={() => setRegenerateImageId(null)}
          onConfirm={(options) => {
            actions.onRegenerateImage?.(regenerateImage.id, options);
            setRegenerateImageId(null);
          }}
        />
      ) : null}
      {authorOpen ? (
        <div className="wao-modal-backdrop" role="dialog" aria-modal="true" aria-label="关于作者">
          <div className="wao-modal">
            <button type="button" className="wao-modal__close" onClick={() => setAuthorOpen(false)} aria-label="关闭关于作者">
              ×
            </button>
            <div className="wao-modal__body wao-author-modal__body" dangerouslySetInnerHTML={{ __html: state.authorHtml ?? "<p>未找到关于作者文案。</p>" }} />
          </div>
        </div>
      ) : null}
      <div className="wao-visually-hidden" aria-live="polite">
        当前状态：{state.status}，标题：{title}
      </div>
    </div>
  );
}

function extractTitle(previewHtml: string): string {
  const match = previewHtml.match(/<h1[^>]*>(.*?)<\/h1>/i);
  return match?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
}

function PublishStats({ stats }: { stats: NonNullable<AppState["articlePublishStats"]> }) {
  return (
    <div className="wao-publish-stats" aria-label="发布数据">
      <span className="wao-publish-stats__item" title="发布时间">
        <CalendarIcon />
        <span>{stats.publishedAt}</span>
      </span>
      <span className="wao-publish-stats__item" title="阅读">
        <ReadIcon />
        <span>{stats.readCount}</span>
      </span>
      <span className="wao-publish-stats__item" title="点赞">
        <LikeIcon />
        <span>{stats.likeCount}</span>
      </span>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg className="wao-publish-stats__icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
    </svg>
  );
}

function ReadIcon() {
  return (
    <svg className="wao-publish-stats__icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function LikeIcon() {
  return (
    <svg className="wao-publish-stats__icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 11v10H3V11h4Z" />
      <path d="M7 11l4-8 1.7.6c.9.3 1.4 1.2 1.1 2.1L13 9h5.3c1.4 0 2.4 1.3 2.1 2.7l-1.2 5.7A3 3 0 0 1 16.3 20H7" />
    </svg>
  );
}

function HelpCircleIcon() {
  return (
    <svg
      className="wao-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.3 9.3a2.7 2.7 0 1 1 4.4 2.1c-.9.7-1.4 1.2-1.4 2.3" />
      <circle cx="12" cy="16.8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SmartImageIcon() {
  return (
    <svg
      className="wao-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
