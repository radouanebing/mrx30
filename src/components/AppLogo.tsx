import React from "react";

interface AppLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showText?: boolean;
}

export default function AppLogo({ size = "md", className = "", showText = false }: AppLogoProps) {
  // Dimensions based on size preset
  const dimensions = {
    sm: { svg: "h-9 w-9", text: "text-lg", sub: "text-[9px]" },
    md: { svg: "h-14 w-14", text: "text-xl", sub: "text-[10px]" },
    lg: { svg: "h-20 w-20", text: "text-2xl", sub: "text-xs" },
    xl: { svg: "h-32 w-32", text: "text-3xl", sub: "text-sm" },
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`} id="app-logo-wrapper">
      {/* SVG Emblem */}
      <div className={`relative ${dimensions.svg} flex items-center justify-center mb-1`} id="logo-emblem">
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-full h-full drop-shadow-md select-none transition-transform hover:scale-105 duration-300"
        >
          {/* Definitions for Gradients */}
          <defs>
            <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" /> {/* sky-500 */}
              <stop offset="100%" stopColor="#0f172a" /> {/* slate-900 */}
            </linearGradient>
            <linearGradient id="boneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" /> {/* sky-400 */}
              <stop offset="50%" stopColor="#14b8a6" /> {/* teal-500 */}
              <stop offset="100%" stopColor="#0369a1" /> {/* sky-700 */}
            </linearGradient>
            <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.2" /> {/* teal-400 opacity */}
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Central Glow Effect */}
          <circle cx="50" cy="50" r="40" fill="url(#glowGrad)" />

          {/* Double Concentric Inner Rings */}
          <circle cx="50" cy="50" r="32" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 2" />
          <circle cx="50" cy="50" r="28" stroke="#0ea5e9" strokeWidth="1.5" strokeOpacity="0.3" />

          {/* Outer Orbit / Scan Loop (tilted ellipse around the emblem with a scanning head) */}
          <g transform="rotate(-15 50 50)">
            <ellipse 
              cx="50" 
              cy="50" 
              rx="40" 
              ry="26" 
              stroke="url(#orbitGrad)" 
              strokeWidth="3.5" 
              strokeLinecap="round"
            />
            {/* Glowing Orb/Emitter on Orbit path */}
            <circle cx="90" cy="50" r="4.5" fill="#14b8a6" className="animate-pulse" />
            <circle cx="90" cy="50" r="7" stroke="#14b8a6" strokeWidth="1" strokeOpacity="0.5" />
          </g>

          {/* Inner Scan Target Grid */}
          <line x1="50" y1="22" x2="50" y2="78" stroke="#14b8a6" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="22" y1="50" x2="78" y2="50" stroke="#14b8a6" strokeWidth="0.5" strokeOpacity="0.4" />

          {/* Main Stylized Radiology 'X' Bones */}
          <g stroke="url(#boneGrad)" strokeWidth="6.5" strokeLinecap="round">
            {/* Diagonal Bone 1 (Top Left to Bottom Right) with stylized joint-like bulbous tips */}
            <path d="M 33,33 C 38,38 42,42 50,50 C 58,58 62,62 67,67" />
            
            {/* Diagonal Bone 2 (Top Right to Bottom Left) */}
            <path d="M 67,33 C 62,38 58,42 50,50 C 42,58 38,62 33,67" />
          </g>

          {/* Specialized X-ray Bone Cap Joint/Bulbs (makes the bone look organic and premium) */}
          <g fill="url(#boneGrad)">
            {/* Top-Left caps */}
            <circle cx="33" cy="31" r="4.5" />
            <circle cx="31" cy="33" r="4.5" />

            {/* Top-Right caps */}
            <circle cx="67" cy="31" r="4.5" />
            <circle cx="69" cy="33" r="4.5" />

            {/* Bottom-Left caps */}
            <circle cx="33" cy="69" r="4.5" />
            <circle cx="31" cy="67" r="4.5" />

            {/* Bottom-Right caps */}
            <circle cx="67" cy="69" r="4.5" />
            <circle cx="69" cy="67" r="4.5" />
          </g>

          {/* Human Head Sphere placed over the top of the X pattern */}
          <circle cx="50" cy="28" r="6" fill="#0ea5e9" stroke="#ffffff" strokeWidth="1.5" />

          {/* Center Connector nucleus Sphere */}
          <circle cx="50" cy="50" r="4" fill="#ffffff" stroke="#14b8a6" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Show accompanying text labels exactly matching the user's logo file */}
      {showText && (
        <div className="space-y-1 block mt-2 text-center" id="logo-text-container">
          <h1 className={`font-black tracking-widest uppercase bg-gradient-to-r from-sky-400 via-teal-400 to-sky-300 bg-clip-text text-transparent underline decoration-sky-600/30 ${dimensions.text} font-mono leading-none`}>
            MRX RN
          </h1>
          <p className={`font-black text-slate-300 tracking-normal ${dimensions.sub} select-none`}>
            تطبيق مصلحة الأشعة
          </p>
        </div>
      )}
    </div>
  );
}
