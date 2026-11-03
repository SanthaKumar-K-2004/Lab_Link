import React from "react";
import { motion } from "framer-motion";

/**
 * Clean line-art Honeycomb Hexagons matching top-right watermark in reference image
 */
export const HexagonLattice: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <motion.svg
      viewBox="0 0 160 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-sky-400/50 dark:text-sky-400/30 ${className}`}
      animate={{
        y: [0, -6, 0],
      }}
      transition={{
        duration: 9,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Top-left hexagon */}
      <polygon
        points="60,16 88,32 88,64 60,80 32,64 32,32"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Connected bottom-right hexagon sharing top-left segment (88,32)-(88,64) */}
      <polygon
        points="88,64 116,80 116,112 88,128 60,112 60,80"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
};

/**
 * Clean line-art Laboratory Conical Flask matching bottom-left watermark in reference image
 */
export const FlaskWatermark: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <motion.svg
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-sky-400/55 dark:text-sky-400/30 ${className}`}
      animate={{
        y: [0, -5, 0],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Lip/Rim */}
      <rect x="42" y="8" width="16" height="4" rx="2" stroke="currentColor" strokeWidth="2" />
      {/* Neck */}
      <path d="M45 12V34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M55 12V34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Body */}
      <path
        d="M45 34L18 96C16 101 20 106 25 106H75C80 106 84 101 82 96L55 34"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Liquid level */}
      <path
        d="M26 80C36 76 64 76 74 80"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
      {/* Measurement ticks */}
      <line x1="38" y1="58" x2="48" y2="58" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="33" y1="70" x2="45" y2="70" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="28" y1="82" x2="43" y2="82" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </motion.svg>
  );
};

/**
 * Clean line-art Laboratory Microscope matching bottom-right watermark in reference image
 */
export const MicroscopeWatermark: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <motion.svg
      viewBox="0 0 120 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-sky-400/55 dark:text-sky-400/30 ${className}`}
      animate={{
        y: [0, -5, 0],
      }}
      transition={{
        duration: 8.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Eyepiece tube */}
      <line x1="68" y1="14" x2="52" y2="46" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <rect
        x="63"
        y="10"
        width="14"
        height="5"
        rx="2"
        transform="rotate(-28 63 10)"
        stroke="currentColor"
        strokeWidth="2"
      />

      {/* Nosepiece */}
      <circle cx="50" cy="50" r="5" stroke="currentColor" strokeWidth="2" />
      <line x1="46" y1="53" x2="41" y2="64" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />

      {/* Stage */}
      <rect x="25" y="72" width="42" height="4" rx="2" stroke="currentColor" strokeWidth="2" />

      {/* Arm */}
      <path
        d="M52 44C70 46 80 58 80 78C80 94 70 104 56 104H40"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Base */}
      <line x1="42" y1="104" x2="42" y2="112" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <rect x="20" y="112" width="70" height="6" rx="3" stroke="currentColor" strokeWidth="2" />
    </motion.svg>
  );
};

export default {
  HexagonLattice,
  FlaskWatermark,
  MicroscopeWatermark,
};
