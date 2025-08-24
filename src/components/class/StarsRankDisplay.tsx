import React from "react";

interface Props {
  stars: number;
  level: number;
  nextThreshold: number | null;
  levelProgress: number; // 0..1
  justLeveled: boolean;
  condensed?: boolean; // shrinks layout for tight placement
}

const levelThresholds = [0, 5, 10, 20, 30, 40, 50, 60, 80, 100];

function levelClasses(level: number) {
  switch (level) {
    case 1:
      return {
        wrap: "from-gray-400/70 via-gray-400/40 to-gray-500/60 border-gray-300/50",
        glow: "shadow-[0_0_12px_-2px_rgba(156,163,175,0.7)]",
      };
    case 2:
      return {
        wrap: "from-cyan-400/70 via-cyan-400/30 to-teal-500/60 border-cyan-300/50",
        glow: "shadow-[0_0_14px_-2px_rgba(34,211,238,0.7)]",
      };
    case 3:
      return {
        wrap: "from-emerald-400/70 via-green-400/30 to-emerald-500/60 border-emerald-300/50",
        glow: "shadow-[0_0_14px_-2px_rgba(16,185,129,0.7)]",
      };
    case 4:
      return {
        wrap: "from-orange-400/70 via-amber-400/30 to-orange-500/60 border-orange-300/50",
        glow: "shadow-[0_0_14px_-2px_rgba(251,146,60,0.7)]",
      };
    case 5:
      return {
        wrap: "from-violet-400/70 via-purple-400/30 to-fuchsia-500/60 border-fuchsia-300/50",
        glow: "shadow-[0_0_16px_-2px_rgba(167,139,250,0.75)]",
      };
    case 6:
      return {
        wrap: "from-amber-400/70 via-yellow-400/30 to-amber-500/60 border-amber-300/50",
        glow: "shadow-[0_0_16px_-2px_rgba(251,191,36,0.75)]",
      };
    case 7:
      return {
        wrap: "from-sky-400/70 via-blue-400/30 to-indigo-500/60 border-sky-300/50",
        glow: "shadow-[0_0_16px_-2px_rgba(56,189,248,0.75)]",
      };
    case 8:
      return {
        wrap: "from-pink-400/70 via-rose-400/30 to-fuchsia-500/60 border-pink-300/50",
        glow: "shadow-[0_0_18px_-2px_rgba(244,114,182,0.75)]",
      };
    case 9:
      return {
        wrap: "from-emerald-400/70 via-teal-400/30 to-green-500/60 border-emerald-300/50",
        glow: "shadow-[0_0_18px_-2px_rgba(5,150,105,0.75)]",
      };
    case 10:
      return {
        wrap: "from-red-500/70 via-amber-400/30 to-yellow-500/70 border-red-300/60",
        glow: "shadow-[0_0_22px_-2px_rgba(239,68,68,0.85)]",
      };
    default:
      return { wrap: "from-slate-400 to-slate-500", glow: "" };
  }
}

export function StarsRankDisplay({
  stars,
  level,
  nextThreshold,
  levelProgress,
  justLeveled,
  condensed = false,
}: Props) {
  const classes = levelClasses(level);
  const currentBase = levelThresholds[level - 1];
  const rankColors: Record<number, string> = {
    1: "text-gray-200",
    2: "text-cyan-100",
    3: "text-emerald-100",
    4: "text-orange-100",
    5: "text-fuchsia-100",
    6: "text-amber-100",
    7: "text-sky-100",
    8: "text-pink-100",
    9: "text-teal-100",
    10: "text-yellow-50",
  };
  const rankTextColor = rankColors[level] || "text-white";
  const sizes = condensed
    ? {
        gap: "gap-4",
        pad: "pl-4 pr-5 py-2.5",
        badge: "w-14 h-14 rounded-xl",
        lvlFont: "text-4xl",
        starIcon: "w-8 h-8",
        starFont: "text-4xl",
        progressH: "h-1",
        mtStat: "mt-1",
        mtProgress: "mt-1.5",
      }
    : {
        gap: "gap-6",
        pad: "pl-5 pr-8 py-3",
        badge: "w-20 h-20 rounded-2xl",
        lvlFont: "text-5xl",
        starIcon: "w-10 h-10",
        starFont: "text-5xl",
        progressH: "h-1.5",
        mtStat: "mt-2",
        mtProgress: "mt-2",
      };
  // Align with other sidebar cards: use rounded-xl, similar padding to Card (p-6) but keep internal layout tight.
  const baseRadius = "rounded-xl";
  const outerPad = condensed ? "px-4 py-3" : "px-5 py-4";

  // Track previous stars for animation
  const [prevStars, setPrevStars] = React.useState(stars);
  const [starAnim, setStarAnim] = React.useState(false);
  React.useEffect(() => {
    if (stars > prevStars) {
      setStarAnim(true);
      setTimeout(() => setStarAnim(false), 900); // animation duration
    }
    setPrevStars(stars);
  }, [stars, prevStars]);

  return (
    <div
      className={`relative w-full flex items-center ${
        sizes.gap
      } ${outerPad} ${baseRadius} border bg-gradient-to-br ${classes.wrap} ${
        classes.glow
      } backdrop-blur-md overflow-hidden transition-all duration-500 ${
        justLeveled ? "ring-2 ring-white/40" : ""
      }`}
    >
      <span className="absolute inset-0 opacity-60 mix-blend-overlay bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_60%)] animate-[starShimmer_6s_linear_infinite]" />
      <span
        key={`flash-${stars}`}
        className="pointer-events-none absolute inset-0 animate-[starFlash_.9s_ease-out]"
        style={{
          background:
            "radial-gradient(circle at center, rgba(255,215,128,0.55), rgba(255,215,128,0.25) 40%, transparent 70%)",
        }}
      />
      <div
        className={`relative flex shrink-0 items-center justify-center ${
          sizes.badge
        } border border-white/30 bg-gradient-to-br ${classes.wrap} ${
          justLeveled ? "animate-[levelPulse_1.8s_ease]" : ""
        } shadow-inner ${baseRadius}`}
      >
        <span
          className={`absolute inset-0 ${
            sizes.badge.includes("rounded-xl") ? "rounded-xl" : "rounded-2xl"
          } bg-[conic-gradient(from_0deg,rgba(255,255,255,0.7)_0deg,transparent_120deg,transparent_240deg,rgba(255,255,255,0.7)_360deg)] opacity-25 animate-[spin_8s_linear_infinite]`}
        />
        <span
          className={`relative z-10 ${sizes.lvlFont} font-black ${rankTextColor} drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)] tracking-tight select-none`}
        >
          {level}
        </span>
        {justLeveled && (
          <span
            className={`absolute -inset-1 ${
              sizes.badge.includes("rounded-xl") ? "rounded-2xl" : "rounded-3xl"
            } bg-gradient-to-br from-white/70 to-transparent blur-xl opacity-70 animate-[fadeOut_2s_ease forwards]`}
          />
        )}
      </div>
      <div className="flex flex-col justify-center relative z-10 flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 relative">
            <svg
              viewBox="0 0 24 24"
              className={`${
                sizes.starIcon
              } text-amber-50 drop-shadow-[0_0_16px_rgba(251,191,36,0.95)] ${
                starAnim ? "animate-starBurst" : "animate-starPop_.6s_ease"
              }`}
              fill="currentColor"
              key={`star-${stars}`}
              style={{ zIndex: 2 }}
            >
              <path d="M12 2.75l2.9 6.06 6.68.97-4.84 4.72 1.14 6.65L12 17.77l-5.88 3.38 1.14-6.65L2.42 9.78l6.68-.97L12 2.75z" />
            </svg>
            {starAnim && (
              <span
                className="absolute left-0 top-0 w-full h-full pointer-events-none z-1 animate-starGlow"
                style={{
                  background:
                    "radial-gradient(circle at center, rgba(255,255,128,0.55), rgba(255,215,128,0.25) 40%, transparent 70%)",
                  borderRadius: "50%",
                }}
              />
            )}
            <span
              key={stars}
              className={`${
                sizes.starFont
              } font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-amber-50 via-amber-200 to-orange-200 drop-shadow-[0_0_14px_rgba(251,191,36,0.85)] tabular-nums ${
                starAnim ? "animate-starBurstText" : "animate-starPop_.6s_ease"
              }`}
              style={{ zIndex: 3 }}
            >
              {stars}
            </span>
          </div>
          <div className="flex flex-col leading-snug">
            <span className="text-xs uppercase font-semibold tracking-wider text-amber-50/80">
              Stars
            </span>
            <span className="text-[10px] text-amber-100/70 font-medium">
              Lvl {level}
            </span>
          </div>
        </div>
        <div
          className={`flex items-center gap-2 ${sizes.mtStat} text-[11px] text-amber-100/70 font-medium`}
        >
          {nextThreshold && (
            <span className="truncate">
              {stars - currentBase}/{nextThreshold - currentBase} to L
              {level + 1}
            </span>
          )}
        </div>
        <div
          className={`${sizes.progressH} ${sizes.mtProgress} w-full rounded-full bg-white/10 overflow-hidden`}
          aria-label="Level progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, levelProgress * 100)}
        >
          <div
            className="h-full bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400 transition-all duration-500"
            style={{ width: `${Math.min(100, levelProgress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
