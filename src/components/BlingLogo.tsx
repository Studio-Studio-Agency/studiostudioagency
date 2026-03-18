import { motion } from "framer-motion";

type BlingLogoProps = {
  /** Overall height in px — icon + text scale proportionally */
  size?: number;
  /** Hide the "bling" wordmark */
  iconOnly?: boolean;
  /** Semantic color context */
  mood?: "neutral" | "positive" | "attention" | "urgent" | "expired" | "inactive";
  className?: string;
};

const MOOD_COLORS: Record<NonNullable<BlingLogoProps["mood"]>, { core: string; glow: string }> = {
  neutral:   { core: "#ffffff",  glow: "rgba(255,255,255,0.35)" },
  positive:  { core: "#b6f7a0",  glow: "rgba(182,247,160,0.30)" },
  attention: { core: "#ffd666",  glow: "rgba(255,214,102,0.35)" },
  urgent:    { core: "#ffa940",  glow: "rgba(255,169,64,0.30)" },
  expired:   { core: "#ff4d4f",  glow: "rgba(255,77,79,0.25)" },
  inactive:  { core: "#8c8c8c",  glow: "rgba(140,140,140,0.15)" },
};

const RAY_COUNT = 24;

const BlingLogo = ({
  size = 36,
  iconOnly = false,
  mood = "neutral",
  className = "",
}: BlingLogoProps) => {
  const { core, glow } = MOOD_COLORS[mood];
  const iconSize = iconOnly ? size : size * 0.65;
  const center = iconSize / 2;
  const maxRay = iconSize * 0.48;
  const minRay = iconSize * 0.18;

  // Generate deterministic but varied rays
  const rays = Array.from({ length: RAY_COUNT }, (_, i) => {
    const angle = (360 / RAY_COUNT) * i;
    const isLong = i % 3 === 0;
    const length = isLong ? maxRay : minRay + (maxRay - minRay) * ((i % 5) / 5);
    const width = isLong ? 1.5 : 0.8;
    return { angle, length, width, delay: i * 0.08 };
  });

  return (
    <div className={`inline-flex flex-col items-center gap-0 select-none ${className}`}>
      {/* Starburst icon */}
      <motion.svg
        width={iconSize}
        height={iconSize}
        viewBox={`0 0 ${iconSize} ${iconSize}`}
        style={{ overflow: "visible" }}
        animate={{ rotate: [0, 3, -2, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Outer glow */}
        <motion.circle
          cx={center}
          cy={center}
          r={iconSize * 0.28}
          fill="none"
          stroke={glow}
          strokeWidth={iconSize * 0.12}
          animate={{ r: [iconSize * 0.25, iconSize * 0.32, iconSize * 0.25] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ filter: `blur(${iconSize * 0.06}px)` }}
        />

        {/* Rays */}
        {rays.map((ray, i) => {
          const rad = (ray.angle * Math.PI) / 180;
          const x2 = center + Math.cos(rad) * ray.length;
          const y2 = center + Math.sin(rad) * ray.length;
          return (
            <motion.line
              key={i}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke={core}
              strokeWidth={ray.width}
              strokeLinecap="round"
              initial={{ opacity: 0.4 }}
              animate={{
                opacity: [0.3, 0.9, 0.3],
                x2: [x2, center + Math.cos(rad) * ray.length * 1.08, x2],
                y2: [y2, center + Math.sin(rad) * ray.length * 1.08, y2],
              }}
              transition={{
                duration: 2.5 + (i % 4) * 0.3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: ray.delay,
              }}
            />
          );
        })}

        {/* Core bright dot */}
        <motion.circle
          cx={center}
          cy={center}
          r={iconSize * 0.06}
          fill={core}
          animate={{
            r: [iconSize * 0.05, iconSize * 0.08, iconSize * 0.05],
            opacity: [0.9, 1, 0.9],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ filter: `blur(${iconSize * 0.015}px)` }}
        />

        {/* Inner glow ring */}
        <motion.circle
          cx={center}
          cy={center}
          r={iconSize * 0.1}
          fill="none"
          stroke={core}
          strokeWidth={0.5}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.svg>

      {/* Wordmark */}
      {!iconOnly && (
        <span
          className="text-foreground leading-none"
          style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontStyle: "italic",
            fontSize: size * 0.38,
            letterSpacing: "0.02em",
            marginTop: -(size * 0.04),
          }}
        >
          bling
        </span>
      )}
    </div>
  );
};

export default BlingLogo;
