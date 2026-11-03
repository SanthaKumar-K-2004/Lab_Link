import React from "react";
import { motion } from "framer-motion";
import LineWaves, { LineWavesProps } from "./LineWaves";
import { HexagonLattice, FlaskWatermark, MicroscopeWatermark } from "./ScientificIcons";

export interface ScientificAnimatedBackgroundProps extends Partial<LineWavesProps> {
  children?: React.ReactNode;
  showIcons?: boolean;
}

export const ScientificAnimatedBackground: React.FC<ScientificAnimatedBackgroundProps> = ({
  color1 = "#0284c7",
  color2 = "#38bdf8",
  color3 = "#0ea5e9",
  speed = 0.22,
  lineCount = 64,
  lineWidth = 1.5,
  glow = 0.65,
  brightness = 1.35,
  highlight = 0.45,
  highlightWidth = 1.4,
  warpIntensity = 0.85,
  warpScale = 1.3,
  rotation = -22,
  enableMouseInteraction = true,
  clickRipple = true,
  showIcons = true,
  children,
  className = "",
  ...lineWaveProps
}) => {
  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-gradient-to-b from-[#f8fbff] via-[#edf5fe] to-[#dbeefd] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 ${className}`}
    >
      {/* 1. Soft Ambient Illumination Bloom behind Content */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[550px] bg-[radial-gradient(ellipse_75%_50%_at_50%_40%,rgba(255,255,255,0.98),rgba(235,245,255,0.4)_60%,transparent_85%)]" />
        <div className="absolute top-[8%] -left-[6%] w-[550px] h-[550px] rounded-full bg-sky-200/35 blur-[120px]" />
        <div className="absolute top-[12%] -right-[6%] w-[600px] h-[600px] rounded-full bg-blue-200/30 blur-[130px]" />
      </div>

      {/* 2. Interactive Animated LineWaves Canvas (Crisp, High Contrast, Interactive) */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <LineWaves
          color1={color1}
          color2={color2}
          color3={color3}
          speed={speed}
          lineCount={lineCount}
          lineWidth={lineWidth}
          glow={glow}
          brightness={brightness}
          highlight={highlight}
          highlightWidth={highlightWidth}
          warpIntensity={warpIntensity}
          warpScale={warpScale}
          rotation={rotation}
          enableMouseInteraction={enableMouseInteraction}
          clickRipple={clickRipple}
          opacity={0.88}
          className="w-full h-full"
          {...lineWaveProps}
        />
      </div>

      {/* 3. Silky Sweeping Wave Ribbons matching Reference Image */}
      <div className="absolute inset-x-0 bottom-0 h-[360px] md:h-[420px] pointer-events-none z-0 overflow-hidden">
        {/* Layer 1: Undulating Background Wave & Stipple Field */}
        <motion.div
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0"
        >
          <svg
            viewBox="0 0 1440 420"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Halftone / Stipple Matrix Pattern */}
              <pattern id="stippleDots" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                <circle cx="6" cy="6" r="1.1" fill="#38bdf8" fillOpacity="0.4" />
              </pattern>

              {/* Secondary wave fill */}
              <linearGradient id="backWaveGrad" x1="720" y1="120" x2="720" y2="420" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                <stop offset="60%" stopColor="#e0f2fe" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.15" />
              </linearGradient>
            </defs>

            {/* Stippled micro-dot particle band flowing along right curve */}
            <path
              d="M 680,270 C 920,290 1180,240 1440,270 L 1440,420 L 680,420 Z"
              fill="url(#stippleDots)"
            />

            {/* Stippled micro-dot band on left */}
            <path
              d="M 0,310 C 220,330 460,300 680,320 L 680,420 L 0,420 Z"
              fill="url(#stippleDots)"
              fillOpacity="0.5"
            />

            {/* Secondary sweeping wave path */}
            <path
              d="M 0,260 C 380,180 720,340 1120,270 C 1280,240 1380,270 1440,285 L 1440,420 L 0,420 Z"
              fill="url(#backWaveGrad)"
            />
            <path
              d="M 0,260 C 380,180 720,340 1120,270 C 1280,240 1380,270 1440,285"
              stroke="#93c5fd"
              strokeWidth="1.2"
              strokeOpacity="0.45"
              strokeDasharray="4 6"
            />
          </svg>
        </motion.div>

        {/* Layer 2: Main Silk Wave Ribbon with Luminous Glowing Crest Edge */}
        <motion.div
          animate={{
            y: [0, -10, 0],
            scaleY: [1, 1.025, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0"
        >
          <svg
            viewBox="0 0 1440 420"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Translucent silk wave fill */}
              <linearGradient id="silkWaveGrad" x1="720" y1="160" x2="720" y2="420" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
                <stop offset="45%" stopColor="#e0f2fe" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.25" />
              </linearGradient>

              {/* Specular glowing crest edge */}
              <linearGradient id="crestNeonGlow" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.4" />
                <stop offset="25%" stopColor="#bae6fd" stopOpacity="0.8" />
                <stop offset="48%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="65%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="88%" stopColor="#7dd3fc" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {/* Wave body with translucent glassmorphic gradient */}
            <path
              d="M 0,220 C 260,140 540,310 880,240 C 1120,195 1310,130 1440,160 L 1440,420 L 0,420 Z"
              fill="url(#silkWaveGrad)"
            />

            {/* Specular Glowing Rim Light Line along Crest */}
            <path
              d="M 0,220 C 260,140 540,310 880,240 C 1120,195 1310,130 1440,160"
              stroke="url(#crestNeonGlow)"
              strokeWidth="2.8"
              strokeLinecap="round"
              style={{
                filter: "drop-shadow(0px -1px 5px rgba(255,255,255,0.95)) drop-shadow(0px 2px 12px rgba(56,189,248,0.55))",
              }}
            />
          </svg>
        </motion.div>
      </div>

      {/* 4. Minimalist Watermark Laboratory Icons (Top-Right, Left, Right) */}
      {showIcons && (
        <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
          {/* Top-Right: Hexagon lattice molecular structure */}
          <div className="absolute right-6 top-16 md:right-24 md:top-24 w-24 md:w-32">
            <HexagonLattice />
          </div>

          {/* Left: Erlenmeyer Flask */}
          <div className="absolute left-6 md:left-20 top-[48%] -translate-y-1/2 w-14 md:w-20">
            <FlaskWatermark />
          </div>

          {/* Right: Precision Microscope */}
          <div className="absolute right-6 md:right-20 top-[60%] -translate-y-1/2 w-18 md:w-24">
            <MicroscopeWatermark />
          </div>
        </div>
      )}

      {/* 5. Foreground Content */}
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
};

export default ScientificAnimatedBackground;
