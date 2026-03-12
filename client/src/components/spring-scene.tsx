import { useEffect, useState } from "react";

interface Petal {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  sway: number;
  color: string;
}

const PETAL_COLORS = ["#ffb7c5", "#ffc8d5", "#ff9eb5", "#ffd6e0", "#ffafc7", "#ffe4ea"];

export function SpringScene() {
  const [petals, setPetals] = useState<Petal[]>([]);

  useEffect(() => {
    const generated: Petal[] = Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 6 + Math.random() * 8,
      delay: Math.random() * 6,
      duration: 5 + Math.random() * 5,
      sway: 30 + Math.random() * 60,
      color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
    }));
    setPetals(generated);
  }, []);

  return (
    <>
      <style>{`
        @keyframes growTree {
          0%   { transform: scaleY(0) scaleX(0.4); transform-origin: bottom center; }
          60%  { transform: scaleY(1.08) scaleX(1.05); transform-origin: bottom center; }
          80%  { transform: scaleY(0.97) scaleX(0.98); transform-origin: bottom center; }
          100% { transform: scaleY(1) scaleX(1); transform-origin: bottom center; }
        }
        @keyframes bloomCanopy {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.12); opacity: 1; }
          80%  { transform: scale(0.96); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bloomFlower {
          0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
          70%  { transform: scale(1.15) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes swayTree {
          0%, 100% { transform: rotate(0deg); }
          25%       { transform: rotate(0.8deg); }
          75%       { transform: rotate(-0.8deg); }
        }
        @keyframes petalFall {
          0%   { transform: translateY(-20px) translateX(0px) rotate(0deg); opacity: 1; }
          25%  { transform: translateY(25vh) translateX(var(--sway-right)) rotate(90deg); opacity: 0.9; }
          50%  { transform: translateY(50vh) translateX(0px) rotate(180deg); opacity: 0.7; }
          75%  { transform: translateY(75vh) translateX(var(--sway-left)) rotate(270deg); opacity: 0.5; }
          100% { transform: translateY(105vh) translateX(0px) rotate(360deg); opacity: 0; }
        }
        @keyframes signSwing {
          0%, 100% { transform: rotate(-1.5deg); }
          50%       { transform: rotate(1.5deg); }
        }
        @keyframes grassGrow {
          0%   { transform: scaleY(0); transform-origin: bottom; opacity: 0; }
          100% { transform: scaleY(1); transform-origin: bottom; opacity: 1; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.3); }
        }
        @keyframes floatBee {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33%       { transform: translateY(-8px) translateX(6px); }
          66%       { transform: translateY(4px) translateX(-4px); }
        }
        @keyframes sunRays {
          0%, 100% { opacity: 0.3; transform: scale(1) rotate(0deg); }
          50%       { opacity: 0.6; transform: scale(1.1) rotate(15deg); }
        }
        .tree-trunk { animation: growTree 1.2s cubic-bezier(0.34,1.56,0.64,1) both; }
        .tree-canopy { animation: bloomCanopy 0.9s cubic-bezier(0.34,1.56,0.64,1) both; }
        .flower     { animation: bloomFlower 0.7s cubic-bezier(0.34,1.56,0.64,1) both; }
        .tree-sway  { animation: swayTree 4s ease-in-out infinite; transform-origin: bottom center; }
        .sign-swing { animation: signSwing 3s ease-in-out infinite; transform-origin: top center; }
        .grass-blade { animation: grassGrow 0.6s ease-out both; }
        .bee         { animation: floatBee 2.8s ease-in-out infinite; }
        .sun-rays    { animation: sunRays 3s ease-in-out infinite; }
      `}</style>

      {/* Falling petals layer */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 5 }}>
        {petals.map(p => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: "-20px",
              width: p.size,
              height: p.size,
              borderRadius: "50% 0 50% 0",
              backgroundColor: p.color,
              animationName: "petalFall",
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
              animationFillMode: "both",
              "--sway-right": `${p.sway}px`,
              "--sway-left": `-${p.sway * 0.7}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Spring scene container */}
      <div className="relative w-full overflow-hidden" style={{ height: "100%", minHeight: 180 }}>

        {/* Sky gradient backdrop */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 0%, #e8f5e9 60%, #c8e6c9 100%)" }} />

        {/* Sun */}
        <div className="sun-rays absolute" style={{ top: 12, right: "12%", width: 36, height: 36 }}>
          <svg viewBox="0 0 60 60" width="36" height="36">
            <circle cx="30" cy="30" r="13" fill="#FFD700" />
            {[0,45,90,135,180,225,270,315].map((deg, i) => (
              <line key={i} x1="30" y1="30"
                x2={30 + 22 * Math.cos(deg * Math.PI / 180)}
                y2={30 + 22 * Math.sin(deg * Math.PI / 180)}
                stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round"
              />
            ))}
          </svg>
        </div>

        {/* Left cherry blossom tree */}
        <div className="tree-sway absolute" style={{ left: "6%", bottom: 52, animationDelay: "0.2s" }}>
          <div className="tree-trunk" style={{ animationDelay: "0.3s" }}>
            <svg width="60" height="130" viewBox="0 0 60 130">
              {/* Trunk */}
              <path d="M28 130 Q26 100 25 80 Q24 60 27 40" stroke="#8D6E63" strokeWidth="9" strokeLinecap="round" fill="none" />
              {/* Branch left */}
              <path d="M26 75 Q15 60 8 45" stroke="#8D6E63" strokeWidth="5" strokeLinecap="round" fill="none" />
              {/* Branch right */}
              <path d="M27 65 Q38 52 45 38" stroke="#8D6E63" strokeWidth="5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          {/* Canopy blossoms */}
          <div className="tree-canopy absolute" style={{ bottom: 82, left: -18, animationDelay: "0.9s" }}>
            {[
              { cx: 30, cy: 30, r: 28 }, { cx: 10, cy: 42, r: 22 },
              { cx: 50, cy: 38, r: 22 }, { cx: 30, cy: 12, r: 20 },
            ].map((c, i) => (
              <svg key={i} style={{ position: "absolute", left: c.cx - c.r - 6, top: c.cy - c.r - 6, opacity: 0.92 }} width={c.r * 2 + 12} height={c.r * 2 + 12}>
                <circle cx={c.r + 6} cy={c.r + 6} r={c.r} fill={i % 2 === 0 ? "#ffb7c5" : "#ffc8d5"} />
              </svg>
            ))}
          </div>
        </div>

        {/* Right cherry blossom tree */}
        <div className="tree-sway absolute" style={{ right: "6%", bottom: 52, animationDelay: "0.5s" }}>
          <div className="tree-trunk" style={{ animationDelay: "0.5s" }}>
            <svg width="60" height="130" viewBox="0 0 60 130">
              <path d="M32 130 Q34 100 35 80 Q36 60 33 40" stroke="#6D4C41" strokeWidth="9" strokeLinecap="round" fill="none" />
              <path d="M34 75 Q45 60 52 45" stroke="#6D4C41" strokeWidth="5" strokeLinecap="round" fill="none" />
              <path d="M33 65 Q22 52 15 38" stroke="#6D4C41" strokeWidth="5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          <div className="tree-canopy absolute" style={{ bottom: 82, left: -30, animationDelay: "1.1s" }}>
            {[
              { cx: 32, cy: 30, r: 28 }, { cx: 52, cy: 42, r: 22 },
              { cx: 12, cy: 38, r: 22 }, { cx: 32, cy: 12, r: 20 },
            ].map((c, i) => (
              <svg key={i} style={{ position: "absolute", left: c.cx - c.r - 6, top: c.cy - c.r - 6, opacity: 0.92 }} width={c.r * 2 + 12} height={c.r * 2 + 12}>
                <circle cx={c.r + 6} cy={c.r + 6} r={c.r} fill={i % 2 === 0 ? "#ffc8d5" : "#ff9eb5"} />
              </svg>
            ))}
          </div>
        </div>

        {/* Small center tree (green leafy) */}
        <div className="tree-sway absolute" style={{ left: "50%", transform: "translateX(-50%)", bottom: 52, animationDelay: "0.8s" }}>
          <div className="tree-trunk" style={{ animationDelay: "0.7s" }}>
            <svg width="40" height="90" viewBox="0 0 40 90">
              <path d="M20 90 Q19 70 20 50 Q21 35 20 20" stroke="#795548" strokeWidth="6" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          <div className="tree-canopy absolute" style={{ bottom: 58, left: -28, animationDelay: "1.3s" }}>
            <svg width="96" height="80" viewBox="0 0 96 80">
              <ellipse cx="48" cy="44" rx="44" ry="36" fill="#66BB6A" opacity="0.9" />
              <ellipse cx="28" cy="30" rx="28" ry="24" fill="#81C784" opacity="0.85" />
              <ellipse cx="68" cy="30" rx="28" ry="24" fill="#4CAF50" opacity="0.85" />
              <ellipse cx="48" cy="18" rx="24" ry="20" fill="#A5D6A7" opacity="0.85" />
            </svg>
          </div>
        </div>

        {/* Spring Break 2026 sign */}
        <div className="absolute sign-swing" style={{ left: "50%", transform: "translateX(-50%)", bottom: 52, zIndex: 10, width: 200, animationDelay: "0.2s" }}>
          {/* Post */}
          <div style={{ width: 8, height: 40, background: "#8D6E63", margin: "0 auto", borderRadius: 2 }} />
          {/* Board */}
          <div style={{
            background: "linear-gradient(135deg, #F9A825 0%, #FFB300 50%, #F57F17 100%)",
            border: "4px solid #E65100",
            borderRadius: 10,
            padding: "8px 14px",
            textAlign: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            position: "relative",
            marginTop: 2,
          }}>
            {/* Nail dots */}
            <div style={{ position: "absolute", top: 6, left: 8, width: 6, height: 6, borderRadius: "50%", background: "#BF360C" }} />
            <div style={{ position: "absolute", top: 6, right: 8, width: 6, height: 6, borderRadius: "50%", background: "#BF360C" }} />
            <div style={{ position: "absolute", bottom: 6, left: 8, width: 6, height: 6, borderRadius: "50%", background: "#BF360C" }} />
            <div style={{ position: "absolute", bottom: 6, right: 8, width: 6, height: 6, borderRadius: "50%", background: "#BF360C" }} />
            <div style={{ fontSize: 11, fontWeight: 900, color: "#BF360C", letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.1 }}>
              Spring Break
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#1B5E20", letterSpacing: "0.05em", lineHeight: 1.1, marginTop: 2 }}>
              2026
            </div>
          </div>
        </div>

        {/* Ground flowers */}
        {[
          { left: "14%", delay: 0.8, color: "#FF5722", center: "#FFF9C4", size: 20 },
          { left: "20%", delay: 1.0, color: "#9C27B0", center: "#FFF9C4", size: 16 },
          { left: "25%", delay: 0.6, color: "#F06292", center: "#FFEB3B", size: 18 },
          { left: "32%", delay: 1.2, color: "#FF9800", center: "#FFFFFF", size: 15 },
          { left: "68%", delay: 0.9, color: "#4CAF50", center: "#FFEB3B", size: 16 },
          { left: "74%", delay: 0.7, color: "#2196F3", center: "#FFFFFF", size: 19 },
          { left: "80%", delay: 1.1, color: "#E91E63", center: "#FFF9C4", size: 17 },
          { left: "87%", delay: 0.5, color: "#FF5722", center: "#FFEB3B", size: 21 },
        ].map((f, i) => (
          <div
            key={i}
            className="flower absolute"
            style={{ left: f.left, bottom: 52, animationDelay: `${f.delay}s`, zIndex: 6 }}
          >
            <svg width={f.size + 8} height={f.size + 8} viewBox="0 0 40 40">
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <ellipse
                  key={deg}
                  cx={20 + 10 * Math.cos(deg * Math.PI / 180)}
                  cy={20 + 10 * Math.sin(deg * Math.PI / 180)}
                  rx="8" ry="5"
                  fill={f.color}
                  opacity="0.9"
                  transform={`rotate(${deg}, ${20 + 10 * Math.cos(deg * Math.PI / 180)}, ${20 + 10 * Math.sin(deg * Math.PI / 180)})`}
                />
              ))}
              <circle cx="20" cy="20" r="6" fill={f.center} />
            </svg>
            {/* Stem */}
            <svg width={4} height={14} style={{ display: "block", margin: "-2px auto 0" }}>
              <path d="M2 0 Q3 7 2 14" stroke="#388E3C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        ))}

        {/* Grass ground strip */}
        <div className="absolute bottom-0 left-0 right-0" style={{ height: 52 }}>
          <svg width="100%" height="52" viewBox="0 0 800 52" preserveAspectRatio="none">
            <rect x="0" y="20" width="800" height="32" fill="#558B2F" />
            <path d="M0 22 Q20 8 40 22 Q60 8 80 22 Q100 8 120 22 Q140 8 160 22 Q180 8 200 22 Q220 8 240 22 Q260 8 280 22 Q300 8 320 22 Q340 8 360 22 Q380 8 400 22 Q420 8 440 22 Q460 8 480 22 Q500 8 520 22 Q540 8 560 22 Q580 8 600 22 Q620 8 640 22 Q660 8 680 22 Q700 8 720 22 Q740 8 760 22 Q780 8 800 22" fill="#689F38" />
          </svg>
          {/* Grass blades */}
          {Array.from({ length: 32 }, (_, i) => (
            <div
              key={i}
              className="grass-blade absolute bottom-5"
              style={{
                left: `${(i / 32) * 100 + Math.random() * 2.5}%`,
                animationDelay: `${0.4 + i * 0.04}s`,
                width: 3,
                height: 10 + Math.random() * 8,
                background: "#7CB342",
                borderRadius: "2px 2px 0 0",
                transform: `rotate(${-15 + Math.random() * 30}deg)`,
                transformOrigin: "bottom center",
              }}
            />
          ))}
        </div>

        {/* Bee */}
        <div className="bee absolute" style={{ left: "42%", bottom: 155, zIndex: 8, animationDelay: "1s" }}>
          <svg width="20" height="14" viewBox="0 0 20 14">
            <ellipse cx="10" cy="8" rx="8" ry="5" fill="#FFD600" />
            <rect x="5" y="6" width="3" height="6" rx="1" fill="#212121" opacity="0.6" />
            <rect x="9" y="6" width="3" height="6" rx="1" fill="#212121" opacity="0.6" />
            <rect x="13" y="6" width="3" height="6" rx="1" fill="#212121" opacity="0.6" />
            <ellipse cx="7" cy="4" rx="5" ry="3" fill="white" opacity="0.7" />
            <ellipse cx="13" cy="4" rx="5" ry="3" fill="white" opacity="0.7" />
            <circle cx="10" cy="7" r="3" fill="#212121" opacity="0.15" />
          </svg>
        </div>

      </div>
    </>
  );
}
