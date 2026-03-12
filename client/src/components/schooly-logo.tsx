interface SchoolyLogoProps {
  size?: "small" | "large";
  className?: string;
  onClick?: () => void;
}

const COLORS = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"];

const LETTERS = [
  { char: "S", color: COLORS[0] },
  { char: "c", color: COLORS[1] },
  { char: "h", color: COLORS[2] },
  { char: "o", color: COLORS[3] },
  { char: "o", color: COLORS[0] },
  { char: "l", color: COLORS[1] },
  { char: "-", color: COLORS[2] },
  { char: "y", color: COLORS[3] },
];

export function SchoolyLogo({ size = "large", className = "", onClick }: SchoolyLogoProps) {
  const sizeClass = size === "large"
    ? "text-[84px] font-bold leading-none tracking-tight"
    : "text-2xl font-bold leading-none";

  return (
    <div
      className={`${sizeClass} select-none ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
      style={{ fontFamily: "'Google Sans', 'Product Sans', Arial, sans-serif" }}
      data-testid="img-logo"
    >
      {LETTERS.map((l, i) => (
        <span key={i} style={{ color: l.color }}>{l.char}</span>
      ))}
    </div>
  );
}
