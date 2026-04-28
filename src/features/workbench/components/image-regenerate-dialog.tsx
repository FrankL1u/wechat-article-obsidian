import { useEffect, useState, type ReactNode } from "react";
import {
  readCoverAspects,
  readCoverFonts,
  readCoverMoods,
  readCoverTextLevels,
} from "../../images/cover-dimensions";
import {
  COVER_TYPE_OPTIONS,
  ensurePaletteOption,
  ensureStyleOption,
  normalizeCoverType,
  normalizePalette,
  normalizeStyle,
} from "../../images/presets";
import type { RegenerateImageOptions } from "../app";
import type { ImageCard } from "../types";
import { PrimaryButton, SecondaryButton, Spinner } from "./buttons";
import { Dropdown } from "./dropdown";

interface ImageRegenerateDialogProps {
  image: ImageCard;
  open: boolean;
  onClose: () => void;
  onConfirm: (options: RegenerateImageOptions) => void;
  isSubmitting: boolean;
}

function normalizeOption(value: string | undefined, options: string[], fallback: string): string {
  return value && options.includes(value) ? value : fallback;
}

const MOOD_LABELS: Record<string, string> = {
  subtle: "克制",
  balanced: "均衡",
  bold: "强烈",
};

const ASPECT_LABELS: Record<string, string> = {
  "2.35:1": "电影宽屏 2.35:1",
  "16:9": "横版 16:9",
  "1:1": "方形 1:1",
};

const FONT_LABELS: Record<string, string> = {
  clean: "现代清爽",
  handwritten: "手写亲和",
  serif: "优雅衬线",
  display: "醒目标题",
};

const TEXT_LEVEL_LABELS: Record<string, string> = {
  none: "无文字",
  "title-only": "仅标题",
  "title-subtitle": "标题+副标题",
  "text-rich": "标题+副标题+标签",
};

interface RegenerateFieldProps {
  title: string;
  hideTitle?: boolean;
  children: ReactNode;
}

function RegenerateField({ title, hideTitle = false, children }: RegenerateFieldProps) {
  return (
    <div className={["wao-regenerate-dialog__field", hideTitle ? "wao-regenerate-dialog__field--compact" : ""].filter(Boolean).join(" ")}>
      {hideTitle ? null : <span className="wao-regenerate-dialog__label">{title}：</span>}
      {children}
    </div>
  );
}

interface RegenerateFieldGroupProps {
  children: ReactNode;
}

function RegenerateFieldGroup({ children }: RegenerateFieldGroupProps) {
  return <div className="wao-regenerate-dialog__field-group">{children}</div>;
}

export function ImageRegenerateDialog({
  image,
  open,
  onClose,
  onConfirm,
  isSubmitting,
}: ImageRegenerateDialogProps) {
  const [style, setStyle] = useState(normalizeStyle(image.style ?? "editorial"));
  const [palette, setPalette] = useState(normalizePalette(image.palette ?? "default"));
  const [coverType, setCoverType] = useState(normalizeCoverType(image.coverType ?? "conceptual"));
  const [mood, setMood] = useState(image.coverMood ?? "balanced");
  const [aspect, setAspect] = useState(image.coverAspect ?? "2.35:1");
  const [font, setFont] = useState(image.coverFont ?? "clean");
  const [textLevel, setTextLevel] = useState(image.coverTextLevel ?? "title-only");

  useEffect(() => {
    setStyle(normalizeStyle(image.style ?? "editorial"));
    setPalette(normalizePalette(image.palette ?? "default"));
    setCoverType(normalizeCoverType(image.coverType ?? "conceptual"));
    setMood(image.coverMood ?? "balanced");
    setAspect(image.coverAspect ?? "2.35:1");
    setFont(image.coverFont ?? "clean");
    setTextLevel(image.coverTextLevel ?? "title-only");
  }, [image.id, image.style, image.palette, image.coverType, image.coverMood, image.coverAspect, image.coverFont, image.coverTextLevel]);

  useEffect(() => {
    if (!open) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isSubmitting, onClose, open]);

  if (!open) {
    return null;
  }

  const styleOptions = ensureStyleOption(style);
  const paletteOptions = ensurePaletteOption(palette);
  const isCover = image.kind === "cover";
  const moodValues = readCoverMoods().moods.map((item) => item.value);
  const aspectValues = readCoverAspects().aspects.map((item) => item.value);
  const fontValues = readCoverFonts().fonts.map((item) => item.font);
  const textLevelValues = readCoverTextLevels().textLevels.map((item) => item.value);
  const currentMood = normalizeOption(mood, moodValues, "balanced");
  const currentAspect = normalizeOption(aspect, aspectValues, "2.35:1");
  const currentFont = normalizeOption(font, fontValues, "clean");
  const currentTextLevel = normalizeOption(textLevel, textLevelValues, "title-only");

  return (
    <div
      className="wao-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="重新生成图片"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="wao-modal wao-regenerate-dialog">
        <button
          type="button"
          className="wao-modal__close"
          onClick={onClose}
          aria-label="关闭重新生成图片"
          disabled={isSubmitting}
        >
          ×
        </button>
        <div className="wao-regenerate-dialog__header">
          <h3>重新生成图片</h3>
        </div>
        <div className="wao-regenerate-dialog__content">
          <RegenerateField title="风格">
            <Dropdown
              label="风格"
              hideLabel
              value={style}
              options={styleOptions.map((option) => ({ value: option.key, label: option.label }))}
              onChange={(value) => setStyle(normalizeStyle(value))}
              disabled={isSubmitting}
              className="wao-regenerate-dialog__dropdown"
              icon={<StyleIcon />}
            />
          </RegenerateField>
          <RegenerateField title="配色">
            <Dropdown
              label="配色"
              hideLabel
              value={palette}
              options={paletteOptions.map((option) => ({ value: option.key, label: option.label }))}
              onChange={(value) => setPalette(normalizePalette(value))}
              disabled={isSubmitting}
              className="wao-regenerate-dialog__dropdown"
              icon={<PaletteIcon />}
            />
          </RegenerateField>
          {isCover ? (
            <>
              <RegenerateFieldGroup>
                <RegenerateField title="封面类型">
                  <Dropdown
                    label="封面类型"
                    hideLabel
                    value={coverType}
                    options={COVER_TYPE_OPTIONS.filter((option) => option.key !== "none").map((option) => ({ value: option.key, label: option.label }))}
                    onChange={(value) => setCoverType(normalizeCoverType(value))}
                    disabled={isSubmitting}
                    className="wao-regenerate-dialog__dropdown"
                    icon={<CoverIcon />}
                  />
                </RegenerateField>
                <RegenerateField title="情绪" hideTitle>
                  <Dropdown
                    label="情绪"
                    hideLabel
                    value={currentMood}
                    options={readCoverMoods().moods.map((option) => ({ value: option.value, label: MOOD_LABELS[option.value] ?? option.value }))}
                    onChange={(value) => setMood(value)}
                    disabled={isSubmitting}
                    className="wao-regenerate-dialog__dropdown"
                    icon={<MoodIcon />}
                  />
                </RegenerateField>
              </RegenerateFieldGroup>
              <RegenerateFieldGroup>
                <RegenerateField title="字体风格">
                  <Dropdown
                    label="字体风格"
                    hideLabel
                    value={currentFont}
                    options={readCoverFonts().fonts.map((option) => ({ value: option.font, label: FONT_LABELS[option.font] ?? option.font }))}
                    onChange={(value) => setFont(value)}
                    disabled={isSubmitting}
                    className="wao-regenerate-dialog__dropdown"
                    icon={<FontIcon />}
                  />
                </RegenerateField>
                <RegenerateField title="层级" hideTitle>
                  <Dropdown
                    label="层级"
                    hideLabel
                    value={currentTextLevel}
                    options={readCoverTextLevels().textLevels.map((option) => ({ value: option.value, label: TEXT_LEVEL_LABELS[option.value] ?? option.value }))}
                    onChange={(value) => setTextLevel(value)}
                    disabled={isSubmitting}
                    className="wao-regenerate-dialog__dropdown"
                    icon={<TextLevelIcon />}
                  />
                </RegenerateField>
              </RegenerateFieldGroup>
              <RegenerateField title="比例">
                <Dropdown
                  label="比例"
                  hideLabel
                  value={currentAspect}
                  options={readCoverAspects().aspects.map((option) => ({ value: option.value, label: ASPECT_LABELS[option.value] ?? option.value }))}
                  onChange={(value) => setAspect(value)}
                  disabled={isSubmitting}
                  className="wao-regenerate-dialog__dropdown"
                  icon={<AspectIcon />}
                />
              </RegenerateField>
            </>
          ) : null}
        </div>
        <div className="wao-regenerate-dialog__footer">
          <SecondaryButton onClick={onClose} disabled={isSubmitting}>
            取消
          </SecondaryButton>
          <PrimaryButton
            onClick={() => onConfirm(isCover
              ? {
                style,
                palette,
                coverType,
                mood: currentMood,
                aspect: currentAspect,
                font: currentFont,
                textLevel: currentTextLevel,
              }
              : { style, palette })}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner />
                生成中
              </>
            ) : (
              "重新生成"
            )}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function StyleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4h-1a5 5 0 1 1 0-10 5 5 0 0 1 4.58 3" />
      <circle cx="7.5" cy="11.5" r="1" />
      <circle cx="10.5" cy="7.5" r="1" />
      <circle cx="15.5" cy="8.5" r="1" />
      <circle cx="16.5" cy="13.5" r="1" />
    </svg>
  );
}

function CoverIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function MoodIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

function AspectIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h10" />
      <path d="M7 14h6" />
    </svg>
  );
}

function FontIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V4h16v3" />
      <path d="M9 20h6" />
      <path d="M12 4v16" />
    </svg>
  );
}

function TextLevelIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16" />
      <path d="M4 12h12" />
      <path d="M4 18h8" />
    </svg>
  );
}
