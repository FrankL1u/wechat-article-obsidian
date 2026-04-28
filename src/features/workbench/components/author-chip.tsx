import { useEffect, useMemo, useRef, useState } from "react";
import type { ClientOption } from "../types";

interface AuthorChipProps {
  clients: ClientOption[];
  selectedClientId: string | null;
  onOpenSettings?: () => void;
  onSelectClient?: (clientId: string) => void;
}

export function AuthorChip({ clients, selectedClientId, onOpenSettings, onSelectClient }: AuthorChipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? clients[0] ?? null,
    [clients, selectedClientId],
  );
  const label = selectedClient?.author || "未设置作者";
  const isEmpty = clients.length === 0;
  const isSingle = clients.length === 1;
  const isMulti = clients.length > 1;

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const handleClick = () => {
    if (isEmpty || isSingle) {
      onOpenSettings?.();
      return;
    }
    setOpen((value) => !value);
  };

  return (
    <div ref={rootRef} className="wao-author-chip-wrap">
      <button
        type="button"
        className={[
          "wao-trigger",
          "wao-author-chip",
          isEmpty ? "is-empty" : "",
          isSingle ? "is-single" : "",
          isMulti ? "is-multi" : "",
          open ? "is-open" : "",
        ].filter(Boolean).join(" ")}
        onClick={handleClick}
        aria-label={label}
        aria-expanded={isMulti ? open : undefined}
      >
        <UserIcon />
        <span className="wao-author-chip__label">{label}</span>
        {isMulti ? <ChevronDownIcon /> : null}
      </button>
      {isMulti && open ? (
        <div className="wao-menu wao-author-chip__menu" role="menu" aria-label="选择作者">
          {clients.map((client) => (
            <button
              key={client.id}
              type="button"
              role="menuitem"
              className={`wao-menu-item wao-author-chip__menu-item ${client.id === selectedClient?.id ? "is-selected" : ""}`}
              onClick={() => {
                onSelectClient?.(client.id);
                setOpen(false);
              }}
            >
              {client.author}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function UserIcon() {
  return (
    <svg className="wao-author-chip__icon" viewBox="0 0 1024 1024" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M917.901055 147.245575H128.015094c-32.090882 0-58.18826 26.075889-58.18826 58.125839v567.459103c0 32.04688 26.097378 58.125839 58.18826 58.125839h789.885961c32.132838 0 58.168818-26.076912 58.168818-58.125839V205.371414c-.001024-32.04995-26.03598-58.125839-58.168818-58.125839ZM932.999938 772.830517c0 8.243755-6.771217 15.056927-15.099906 15.056927H128.015094c-8.3072 0-15.120372-6.813173-15.120372-15.056927V205.371414c0-8.243755 6.813173-15.057951 15.120372-15.057951h789.885961c8.328689 0 15.099906 6.814196 15.099906 15.057951l-.001023 567.459103Z" />
      <path d="M432.709631 511.054465c31.585369-24.14184 52.405557-61.827137 52.405557-104.474446 0-72.677253-59.092863-131.813095-131.729184-131.813095s-131.729184 59.134819-131.729184 131.813095c0 42.647309 20.797675 80.332606 52.405557 104.474446-70.406536 30.703279-119.846552 100.857059-119.846552 182.535313 0 11.861142 9.610892 21.534456 21.534456 21.534456 11.881608 0 21.534456-9.673313 21.534456-21.534456 0-84.706217 67.818595-153.515373 151.937434-155.701155 1.429559 0 2.734274.419556 4.163833.419556 1.428535 0 2.734274-.419556 4.119831-.419556 84.201727 2.187829 152.000879 70.994937 152.000879 155.701155 0 11.861142 9.631358 21.534456 21.534456 21.534456s21.534456-9.673313 21.534456-21.534456c.00205-81.678254-49.459455-151.832034-119.867991-182.535313ZM264.726755 406.581042c0-48.957015 39.745213-88.745207 88.661296-88.745207 48.872081 0 88.660272 39.788192 88.660272 88.745207 0 47.441499-37.600363 85.967954-84.538395 88.23867-1.385557-.083911-2.691295-.420579-4.119831-.420579-1.429559 0-2.735297.336668-4.163833.420579-46.941101-2.27174-84.499509-40.797171-84.499509-88.23867Z" />
      <path d="M846.863139 314.13556H558.886355c-11.945053 0-21.534456 9.673313-21.534456 21.533432 0 11.861142 9.589402 21.534456 21.534456 21.534456h287.976784c11.904121 0 21.534456-9.673313 21.534456-21.534456 0-11.860118-9.630334-21.533432-21.534456-21.533432ZM846.863139 446.957635H558.886355c-11.945053 0-21.534456 9.589402-21.534456 21.533432 0 11.861142 9.589402 21.534456 21.534456 21.534456h287.976784c11.904121 0 21.534456-9.673313 21.534456-21.534456 0-11.94403-9.630334-21.533432-21.534456-21.533432ZM846.863139 579.778686H601.954243c-11.94403 0-21.533432 9.589402-21.533432 21.533432 0 11.861142 9.589402 21.534456 21.533432 21.534456h244.908896c11.904121 0 21.534456-9.673313 21.534456-21.534456 0-11.943006-9.630334-21.533432-21.534456-21.533432Z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg data-testid="wao-author-chip-arrow" className="wao-author-chip__arrow" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
