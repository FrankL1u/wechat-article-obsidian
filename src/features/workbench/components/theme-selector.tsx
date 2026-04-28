import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { loadBuiltInThemes } from "../../themes/load-themes";
import { FEATURED_THEME_KEYS } from "../../themes/theme-selector-metadata";

interface ThemeSelectorProps {
  themeKey: string;
  onThemeChange: (themeKey: string) => void;
  disabled?: boolean;
}

export function ThemeSelector({ themeKey, onThemeChange, disabled = false }: ThemeSelectorProps) {
  const themes = loadBuiltInThemes();
  const [modalOpen, setModalOpen] = useState(false);
  const [popupRight, setPopupRight] = useState(0);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!modalOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };

    const handleBackdropClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("pointerdown", handleBackdropClick);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("pointerdown", handleBackdropClick);
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;

    const updatePopupAnchor = () => {
      if (!shellRef.current || !moreButtonRef.current) return;

      const shellRect = shellRef.current.getBoundingClientRect();
      const moreButtonRect = moreButtonRef.current.getBoundingClientRect();
      const nextRight = Math.max(0, Math.round(shellRect.right - moreButtonRect.right));
      setPopupRight(nextRight);
    };

    updatePopupAnchor();
    window.addEventListener("resize", updatePopupAnchor);
    return () => window.removeEventListener("resize", updatePopupAnchor);
  }, [modalOpen]);

  const totalThemes = themes.length;
  const featuredThemes = resolveFeaturedThemes(themes, themeKey);

  return (
    <div
      ref={shellRef}
      className="wao-theme-selector-shell"
      style={{ "--wao-theme-popup-right": `${popupRight}px` } as CSSProperties}
    >
      <div className="wao-theme-selector">
        <span className="wao-theme-selector__label">排版风格</span>
        <div className="wao-theme-strip" role="group" aria-label="排版风格快捷选择">
          {featuredThemes.map((theme) => (
            <button
              key={theme.key}
              type="button"
              className={`wao-btn wao-btn--ghost wao-theme-pill ${theme.key === themeKey ? "wao-theme-pill--active" : ""}`}
              disabled={disabled}
              aria-pressed={theme.key === themeKey}
              onClick={() => onThemeChange(theme.key)}
            >
              {theme.name}
            </button>
          ))}
        </div>
        <button
          ref={moreButtonRef}
          type="button"
          className="wao-trigger wao-theme-selector__more"
          disabled={disabled}
          aria-expanded={modalOpen}
          onClick={() => setModalOpen(true)}
        >
          全部 {totalThemes} 款
          <ChevronIcon />
        </button>
      </div>

      {modalOpen && (
        <div className="wao-theme-modal-backdrop">
          <div ref={modalRef} className="wao-theme-modal">
            <div className="wao-theme-modal__header">
              <h3 className="wao-theme-modal__title">选择排版风格 · {totalThemes} 款</h3>
              <button
                type="button"
                className="wao-theme-modal__close"
                onClick={() => setModalOpen(false)}
                aria-label="关闭"
              >
                <CloseIcon />
              </button>
            </div>
            <div
              className="wao-theme-modal__content"
              role="dialog"
              aria-modal="true"
              aria-label="选择排版主题"
            >
              <div className="wao-theme-modal__grid">
                {themes.map((theme) => {
                  const isActive = theme.key === themeKey;
                  return (
                    <button
                      key={theme.key}
                      type="button"
                      className={`wao-btn wao-btn--ghost wao-theme-card ${isActive ? "wao-theme-card--active" : ""}`}
                      aria-pressed={isActive}
                      onClick={() => {
                        onThemeChange(theme.key);
                        setModalOpen(false);
                      }}
                    >
                      <div className="wao-theme-card__header">
                        <div className="wao-theme-card__swatches" aria-hidden="true">
                          {theme.swatches.map((color, index) => (
                            <span
                              key={`${theme.key}-${index}`}
                              className="wao-theme-card__swatch"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <span className="wao-theme-card__name">{theme.name}</span>
                      </div>
                      <div className="wao-theme-card__info">
                        <span className="wao-theme-card__desc">{theme.description}</span>
                      </div>
                      {isActive && (
                        <span className="wao-theme-card__check">
                          <CheckIcon />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function resolveFeaturedThemes(themes: ReturnType<typeof loadBuiltInThemes>, currentThemeKey: string) {
  const featuredThemes = FEATURED_THEME_KEYS
    .map((key) => themes.find((theme) => theme.key === key))
    .filter((theme): theme is ReturnType<typeof loadBuiltInThemes>[number] => Boolean(theme));

  if (featuredThemes.some((theme) => theme.key === currentThemeKey)) {
    return featuredThemes;
  }

  const currentTheme = themes.find((theme) => theme.key === currentThemeKey);
  if (!currentTheme) {
    return featuredThemes;
  }

  return [...featuredThemes.slice(0, Math.max(0, FEATURED_THEME_KEYS.length - 1)), currentTheme];
}

function ChevronIcon() {
  return (
    <svg className="wao-theme-selector__chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="wao-theme-modal__close-icon"
      viewBox="0 0 20 20"
      width="14"
      height="14"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
