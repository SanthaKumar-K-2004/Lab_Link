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
  color3 = "#2563eb",
  speed = 0.25,
  lineCount = 56,
  lineWidth = 1.3,
  glow = 0.5,
  brightness = 1.0,
  highlight = 0.85,
  highlightWidth = 1.2,
  warpIntensity = 0.9,
  warpScale = 1.35,
  rotation = -26,
  enableMouseInteraction = true,
  clickRipple = true,
  showIcons = true,
  children,
  className = "",
  ...lineWaveProps
}) => {
  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-gradient-to-b from-[#f9fbfe] via-[#f0f6fe] to-[#e1effc] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 ${className}`}
    >
      {/* 1. Clean, Soft Radiant Lighting */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Soft center-top pure radiance */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-[radial-gradient(ellipse_70%_55%_at_50%_15%,rgba(255,255,255,0.95),rgba(240,248,255,0.3),transparent_75%)]" />
        {/* Delicate sky-blue atmospheric luminescence */}
        <div className="absolute top-[10%] -left-[5%] w-[600px] h-[600px] rounded-full bg-sky-200/25 blur-[130px]" />
        <div className="absolute top-[15%] -right-[5%] w-[650px] h-[650px] rounded-full bg-blue-300/20 blur-[140px]" />
      </div>

      {/* 2. Interactive Animated LineWaves Canvas (Fully visible & interactive) */}
      <div className="absolute inset-0 z-0 opacity-80 pointer-events-auto">
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
          className="w-full h-full"
          {...lineWaveProps}
        />
      </div>

      {/* 3. Sweeping Smooth Wave Ribbon - Smoothly Undulating */}
      <motion.div
        animate={{
          y: [0, -8, 0],
          scaleY: [1, 1.03, 1],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-x-0 bottom-0 h-[380px] pointer-events-none z-0 overflow-hidden"
      >
        <svg
          viewBox="0 0 1440 380"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Primary soft glass wave gradient */}
            <linearGradient id="waveGlassGrad" x1="720" y1="60" x2="720" y2="380" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.82" />
              <stop offset="40%" stopColor="#f0f7fe" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#dceefe" stopOpacity="0.5" />
            </linearGradient>

            {/* Specular edge glow line */}
            <linearGradient id="crestGlow" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.3" />
              <stop offset="35%" stopColor="#bae6fd" stopOpacity="0.75" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.98" />
              <stop offset="85%" stopColor="#7dd3fc" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
            </linearGradient>

            {/* Dotted stipple matrix pattern matching reference */}
            <pattern id="stipplePattern" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="7" cy="7" r="1.1" fill="#38bdf8" fillOpacity="0.32" />
            </pattern>
          </defs>

          {/* Background curved dot-matrix stipple field in bottom-right */}
          <path
            d="M 640,280 C 880,310 1150,250 1440,290 L 1440,380 L 640,380 Z"
            fill="url(#stipplePattern)"
            className="opacity-75"
          />

          {/* Secondary subtle wave curve behind */}
          <path
            d="M 0,290 C 340,240 680,330 1080,270 C 1260,250 1380,280 1440,295"
            stroke="#93c5fd"
            strokeWidth="1.2"
            strokeOpacity="0.4"
            strokeDasharray="4 6"
          />

          {/* Gracefully sweeping main wave body */}
          <path
            d="M 0,230 C 280,150 560,300 900,240 C 1120,200 1320,120 1440,150 L 1440,380 L 0,380 Z"
            fill="url(#waveGlassGrad)"
          />

          {/* Luminous Specular Wave Crest Edge */}
          <path
            d="M 0,230 C 280,150 560,300 900,240 C 1120,200 1320,120 1440,150"
            stroke="url(#crestGlow)"
            strokeWidth="2.4"
            strokeLinecap="round"
            style={{
              filter: "drop-shadow(0px -1px 4px rgba(255,255,255,0.95)) drop-shadow(0px 2px 10px rgba(56,189,248,0.45))",
            }}
          />
        </svg>
      </motion.div>

      {/* 4. Watermark Laboratory Icons (Top-Right, Bottom-Left, Bottom-Right) */}
      {showIcons && (
        <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
          {/* Top-Right: Hexagon lattice */}
          <div className="absolute right-8 top-16 md:right-28 md:top-24 w-28 md:w-36">
            <HexagonLattice />
          </div>

          {/* Bottom-Left: Erlenmeyer Flask */}
          <div className="absolute left-8 bottom-12 md:left-20 md:bottom-24 w-16 md:w-24">
            <FlaskWatermark />
          </div>

          {/* Bottom-Right: Precision Microscope */}
          <div className="absolute right-8 bottom-12 md:right-24 md:bottom-24 w-20 md:w-28">
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
