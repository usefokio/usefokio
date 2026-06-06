const AVATAR_COLORS: Record<string, string> = {
  AB: "#7C6E5A",
  CM: "#5A7C6E",
  FL: "#5A6E7C",
  GT: "#7C7C5A",
  IR: "#6E5A7C",
  LF: "#7C5A6E",
  MC: "#5A7C7C",
  RF: "#2C2C2A",
};

interface AvatarProps {
  initials: string;
  size?: number;
}

export function Avatar({ initials, size = 32 }: AvatarProps) {
  const bg = AVATAR_COLORS[initials] ?? "#888";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.34,
        fontWeight: 600,
        color: "#fff",
        flexShrink: 0,
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  );
}
