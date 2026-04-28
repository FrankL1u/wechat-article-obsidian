import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const CLOSE_ALL_DROPDOWNS_EVENT = "wao-close-all-dropdowns";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  className?: string;
  hideLabel?: boolean;
  align?: "left" | "right";
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function Dropdown({
  label,
  value,
  options,
  onChange,
  className,
  hideLabel = false,
  align = "left",
  disabled = false,
  icon,
}: DropdownProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);
  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger) return;

      const triggerRect = trigger.getBoundingClientRect();
      const menuHeight = menu?.offsetHeight || 200;
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

      setMenuPosition({
        top: openUp ? triggerRect.top - menuHeight - 8 : triggerRect.bottom + 8,
        left: triggerRect.left,
        width: triggerRect.width,
        openUp,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const handleCloseAll = () => {
      setOpen(false);
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener(CLOSE_ALL_DROPDOWNS_EVENT, handleCloseAll);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener(CLOSE_ALL_DROPDOWNS_EVENT, handleCloseAll);
    };
  }, []);

  const menu = open && !disabled && menuPosition
    ? createPortal(
        <div
          ref={menuRef}
          className="wao-dropdown__menu wao-dropdown__menu--portal"
          role="listbox"
          aria-label={label}
          style={{
            position: "fixed",
            top: menuPosition.top,
            left: menuPosition.left,
            width: menuPosition.width,
            zIndex: 10050,
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === selected?.value}
              className="wao-menu-item wao-dropdown__option"
              onClick={(e) => {
                e.stopPropagation();
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className={["wao-dropdown", className].filter(Boolean).join(" ")}>
      <span className={hideLabel ? "wao-visually-hidden" : "wao-dropdown__label"}>{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className="wao-trigger wao-dropdown__trigger"
        aria-label={`${label}：${selected?.label ?? ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          if (open) {
            setOpen(false);
          } else {
            dispatchCloseAllDropdowns();
            setOpen(true);
          }
        }}
      >
        {icon && <span className="wao-dropdown__trigger-icon">{icon}</span>}
        <span className="wao-dropdown__trigger-text">{selected?.label}</span>
        <span className="wao-dropdown__chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {menu}
    </div>
  );
}

export function dispatchCloseAllDropdowns(): void {
  window.dispatchEvent(new CustomEvent(CLOSE_ALL_DROPDOWNS_EVENT));
}
