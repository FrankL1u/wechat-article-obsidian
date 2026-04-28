import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";

interface BaseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function PrimaryButton({
  children,
  className,
  icon,
  fullWidth,
  ...props
}: PropsWithChildren<BaseButtonProps>) {
  return (
    <button
      type="button"
      className={["wao-btn", "wao-btn--primary", "wao-primary-button", fullWidth ? "wao-primary-button--full" : "", className].filter(Boolean).join(" ")}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  icon,
  ...props
}: PropsWithChildren<BaseButtonProps>) {
  return (
    <button type="button" className={["wao-btn", "wao-btn--secondary", "wao-secondary-button", className].filter(Boolean).join(" ")} {...props}>
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function IconButton({
  children,
  className,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button type="button" className={["wao-btn", "wao-btn--ghost", "wao-icon-button", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </button>
  );
}

export function Spinner() {
  return <span className="wao-spinner" aria-hidden="true" data-testid="wao-spinner" />;
}
