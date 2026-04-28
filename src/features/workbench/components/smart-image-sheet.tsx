import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  INLINE_IMAGE_MODE_OPTIONS,
  INLINE_IMAGE_TYPE_OPTIONS,
  ensureCoverTypeOption,
  ensurePaletteOption,
  ensureStyleOption,
  normalizeCoverType,
  normalizeInlineMode,
  normalizeInlineType,
  normalizePalette,
  normalizeStyle,
} from "../../images/presets";
import type { ImageOptions } from "../../images/types";
import { PrimaryButton, Spinner } from "./buttons";
import { Dropdown } from "./dropdown";

interface SmartImageSheetProps {
  open: boolean;
  onClose: () => void;
  imageOptions: ImageOptions;
  onOptionsChange: (partial: Partial<ImageOptions>) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  isDisabled: boolean;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

type PopupPosition = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

export function SmartImageSheet({
  open,
  onClose,
  imageOptions,
  onOptionsChange,
  onGenerate,
  isGenerating,
  isDisabled,
  triggerRef,
}: SmartImageSheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [localOptions, setLocalOptions] = useState<ImageOptions>(imageOptions);
  const [popupStyle, setPopupStyle] = useState<PopupPosition | null>(null);

  useEffect(() => {
    setLocalOptions(imageOptions);
  }, [imageOptions]);

  useLayoutEffect(() => {
    if (!open || !triggerRef?.current) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const popupHeight = 480;
      const spaceBelow = viewportHeight - rect.bottom;
      const showAbove = spaceBelow < popupHeight;

      if (showAbove) {
        setPopupStyle({
          bottom: viewportHeight - rect.top + 8,
          right: window.innerWidth - rect.right,
        });
      } else {
        setPopupStyle({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);
    document.addEventListener("keydown", handleEscape);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  const coverTypeOptions = ensureCoverTypeOption(localOptions.coverType);
  const styleOptions = ensureStyleOption(localOptions.style);
  const paletteOptions = ensurePaletteOption(localOptions.palette ?? "default");

  return (
    <>
      <div className="wao-sheet-backdrop" onClick={onClose} />
      <div
        ref={sheetRef}
        className="wao-sheet"
        style={popupStyle ?? undefined}
      >
        <div className="wao-sheet__header">
          <h3 className="wao-sheet__title">智能配图设置</h3>
          <button
            type="button"
            className="wao-sheet__close-btn"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="wao-sheet__content">
          <div className="wao-sheet__field">
            <span className="wao-sheet__field-label">风格：</span>
            <Dropdown
              label="配图风格"
              hideLabel
              value={normalizeStyle(localOptions.style)}
              options={styleOptions.map((option) => ({ value: option.key, label: option.label }))}
              onChange={(value) => setLocalOptions((prev) => ({ ...prev, style: value }))}
              icon={<StyleIcon />}
            />
          </div>

          <div className="wao-sheet__field">
            <span className="wao-sheet__field-label">配色：</span>
            <Dropdown
              label="配色"
              hideLabel
              value={normalizePalette(localOptions.palette ?? "default")}
              options={paletteOptions.map((option) => ({ value: option.key, label: option.label }))}
              onChange={(value) => setLocalOptions((prev) => ({ ...prev, palette: normalizePalette(value) }))}
              icon={<PaletteIcon />}
            />
          </div>

          <div className="wao-sheet__field">
            <span className="wao-sheet__field-label">封面：</span>
            <Dropdown
              label="封面类型"
              hideLabel
              value={normalizeCoverType(localOptions.coverType)}
              options={coverTypeOptions.map((option) => ({ value: option.key, label: option.label }))}
              onChange={(value) => setLocalOptions((prev) => ({ ...prev, coverType: value }))}
              icon={<CoverIcon />}
            />
          </div>

          <div className="wao-sheet__field">
            <span className="wao-sheet__field-label">数量：</span>
            <Dropdown
              label="正文图数量"
              hideLabel
              value={normalizeInlineMode(localOptions.inlineMode)}
              options={INLINE_IMAGE_MODE_OPTIONS.map((option) => ({ value: option.key, label: option.label }))}
              onChange={(value) => setLocalOptions((prev) => ({ ...prev, inlineMode: normalizeInlineMode(value) }))}
              icon={<CountIcon />}
            />
          </div>

          <div className="wao-sheet__field">
            <span className="wao-sheet__field-label">类型：</span>
            <Dropdown
              label="正文图风格"
              hideLabel
              value={normalizeInlineType(localOptions.inlineType)}
              options={INLINE_IMAGE_TYPE_OPTIONS.map((option) => ({ value: option.key, label: option.label }))}
              onChange={(value) => setLocalOptions((prev) => ({ ...prev, inlineType: normalizeInlineType(value) }))}
              icon={<TypeIcon />}
            />
          </div>

        </div>

        <div className="wao-sheet__footer">
          <PrimaryButton
            onClick={() => {
              onOptionsChange(localOptions);
              onGenerate();
            }}
            disabled={isDisabled}
            aria-busy={isGenerating}
            fullWidth
          >
            {isGenerating ? (
              <>
                <Spinner />
                <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>生成中</span>
              </>
            ) : (
              "立即生成"
            )}
          </PrimaryButton>
        </div>
      </div>
    </>
  );
}

function StyleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function CoverIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function CountIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function TypeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4h-1a5 5 0 1 1 0-10 5 5 0 0 1 4.58 3" />
      <circle cx="7.5" cy="11.5" r="1" />
      <circle cx="10.5" cy="7.5" r="1" />
      <circle cx="15.5" cy="8.5" r="1" />
      <circle cx="16.5" cy="13.5" r="1" />
    </svg>
  );
}
