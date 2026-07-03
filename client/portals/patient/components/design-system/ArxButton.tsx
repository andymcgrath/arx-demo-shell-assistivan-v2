import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft, ArrowUpRight } from "lucide-react";

type ButtonVariant = "primary" | "outline" | "ghost" | "link" | "link-arrow" | "tertiary";
type ButtonShape = "rounded" | "pill";
type ButtonSize = "desktop" | "mobile";

interface ArxButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  shape?: ButtonShape;
  size?: ButtonSize;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  showRightArrow?: boolean;
  showLeftArrow?: boolean;
  showUpArrow?: boolean;
}

export function ArxButton({
  children,
  variant = "primary",
  shape = "rounded",
  size = "desktop",
  disabled = false,
  onClick,
  className,
  type = "button",
  showRightArrow = false,
  showLeftArrow = false,
  showUpArrow = false,
}: ArxButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arx-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  const sizeClasses = {
    desktop: "h-14 px-8 text-base",
    mobile: "h-14 px-0 text-base w-full",
  };

  const shapeClasses = {
    rounded: "rounded-lg",
    pill: "rounded-full",
  };

  const variantClasses = {
    primary:
      "bg-arx-primary text-white hover:bg-arx-primary-dark active:bg-arx-primary",
    outline:
      "border-2 border-arx-primary text-arx-primary bg-transparent hover:bg-arx-primary hover:text-white active:bg-arx-primary active:text-white",
    ghost:
      "bg-transparent text-arx-primary hover:bg-arx-sky hover:text-arx-primary",
    link: "text-arx-primary font-bold underline hover:opacity-80 p-0 h-auto",
    "link-arrow":
      "text-arx-primary font-bold hover:opacity-80 p-0 h-auto gap-1.5",
    tertiary:
      "text-arx-primary font-bold uppercase text-sm tracking-wide gap-2 p-0 h-auto hover:opacity-80",
  };

  if (variant === "link" || variant === "link-arrow" || variant === "tertiary") {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(baseClasses, variantClasses[variant], className)}
      >
        {variant === "tertiary" && showLeftArrow && (
          <ChevronLeft className="w-5 h-5" />
        )}
        {children}
        {variant === "link-arrow" && showRightArrow && (
          <ChevronRight className="w-5 h-5 mt-0.5" />
        )}
        {variant === "link-arrow" && showUpArrow && (
          <ArrowUpRight className="w-5 h-5" />
        )}
      </button>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        baseClasses,
        sizeClasses[size],
        shapeClasses[shape],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </button>
  );
}
