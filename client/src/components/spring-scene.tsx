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
    setPetals(Array.from({ length: 22 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 6 + Math.random() * 7,
      delay: Math.random() * 7,
      duration: 6 + Math.random() * 5,
      sway: 25 + Math.random() * 50,
      color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
    })));
  }, []);

  // Scene dimensions — everything in one SVG coordinate system
  const W = 900;
  const H = 200;
  const groundY = 158; // y where the ground surface starts

  // Tree helper: trunk bottom is always AT groundY
  const renderTree = (cx: number, trunkH: number, trunkW: number, canopyRx: number, canopyRy: number, canopyColor1: string, canopyColor2: string, delay: number) => {
    const trunkTop = groundY - trunkH;
    const canopyCx = cx;
    const canopyCy = trunkTop - canopyRy * 0.55;
    return (
      <g style={{ animation: `treeSway 4s ease-in-out ${delay}s infinite`, transformOrigin: `${cx}px ${groundY}px` }}>
        {/* Trunk */}
        <rect x={cx - trunkW / 2} y={trunkTop} width={trunkW} height={trunkH} rx={trunkW / 2} fill="#795548"
          style={{ animation: `growUp 1.0s cubic-bezier(.34,1.56,.64,1) ${delay + 0.1}s both`, transformOrigin: `${cx}px ${groundY}px` }} />
        {/* Canopy shadow */}
        <ellipse cx={canopyCx + 4} cy={canopyCy + 8} rx={canopyRx * 0.85} ry={canopyRy * 0.6} fill="rgba(0,0,0,0.08)"
          style={{ animation: `bloomIn 0.8s cubic-bezier(.34,1.56,.64,1) ${delay + 0.7}s both`, transformOrigin: `${canopyCx}px ${canopyCy}px` }} />
        {/* Main canopy */}
        <ellipse cx={canopyCx} cy={canopyCy} rx={canopyRx} ry={canopyRy} fill={canopyColor1}
          style={{ animation: `bloomIn 0.8s cubic-bezier(.34,1.56,.64,1) ${delay + 0.65}s both`, transformOrigin: `${canopyCx}px ${canopyCy}px` }} />
        {/* Left sub-canopy */}
        <ellipse cx={canopyCx - canopyRx * 0.55} cy={canopyCy + canopyRy * 0.1} rx={canopyRx * 0.6} ry={canopyRy * 0.7} fill={canopyColor2}
          style={{ animation: `bloomIn 0.8s cubic-bezier(.34,1.56,.64,1) ${delay + 0.75}s both`, transformOrigin: `${canopyCx}px ${canopyCy}px` }} />
        {/* Right sub-canopy */}
        <ellipse cx={canopyCx + canopyRx * 0.55} cy={canopyCy + canopyRy * 0.1} rx={canopyRx * 0.6} ry={canopyRy * 0.7} fill={canopyColor2}
          style={{ animation: `bloomIn 0.8s cubic-bezier(.34,1.56,.64,1) ${delay + 0.8}s both`, transformOrigin: `${canopyCx}px ${canopyCy}px` }} />
        {/* Top highlight */}
        <ellipse cx={canopyCx} cy={canopyCy - canopyRy * 0.3} rx={canopyRx * 0.5} ry={canopyRy * 0.45} fill={canopyColor1} opacity={0.7}
          style={{ animation: `bloomIn 0.8s cubic-bezier(.34,1.56,.64,1) ${delay + 0.85}s both`, transformOrigin: `${canopyCx}px ${canopyCy}px` }} />
      </g>
    );
  };

  const renderFlower = (fx: number, color: string, centerColor: string, stemH: number, size: number, delay: number) => {
    const stemTop = groundY - stemH;
    return (
      <g style={{ animation: `bloomIn 0.6s cubic-bezier(.34,1.56,.64,1) ${delay}s both`, transformOrigin: `${fx}px ${groundY}px` }}>
        {/* Stem */}
        <line x1={fx} y1={groundY} x2={fx} y2={stemTop} stroke="#388E3C" strokeWidth={2} strokeLinecap="round" />
        {/* Petals */}
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const px = fx + Math.cos(rad) * size * 0.85;
          const py = stemTop + Math.sin(rad) * size * 0.85;
          return <ellipse key={deg} cx={px} cy={py} rx={size * 0.55} ry={size * 0.35}
            fill={color} opacity={0.92}
            transform={`rotate(${deg}, ${px}, ${py})`} />;
        })}
        {/* Center */}
        <circle cx={fx} cy={stemTop} r={size * 0.45} fill={centerColor} />
      </g>
    );
  };

  return (
    <>
      <style>{`
        @keyframes treeSway {
          0%, 100% { transform: rotate(0deg); }
          30%       { transform: rotate(0.7deg); }
          70%       { transform: rotate(-0.7deg); }
        }
        @keyframes growUp {
          0%   { transform: scaleY(0); }
          100% { transform: scaleY(1); }
        }
        @keyframes bloomIn {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes signSwing {
          0%, 100% { transform: rotate(-1.2deg); }
          50%       { transform: rotate(1.2deg); }
        }
        @keyframes petalFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        @keyframes floatBee {
          0%, 100% { transform: translate(0px, 0px); }
          33%       { transform: translate(5px, -7px); }
          66%       { transform: translate(-4px, 3px); }
        }
        @keyframes sunPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50%       { transform: scale(1.05); opacity: 1; }
        }
        @keyframes grassBlade {
          0%   { transform: scaleY(0); }
          100% { transform: scaleY(1); }
        }
        .spring-sign { animation: signSwing 3s ease-in-out infinite; transform-box: fill-box; transform-origin: center top; }
        .bee         { animation: floatBee 2.5s ease-in-out infinite; }
        .sun         { animation: sunPulse 3s ease-in-out infinite; }
      `}</style>

      {/* Falling petals */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 5 }}>
        {petals.map(p => (
          <div key={p.id} style={{
            position: "absolute",
            left: `${p.x}%`,
            top: "-20px",
            width: p.size,
            height: p.size,
            borderRadius: "50% 0 50% 0",
            backgroundColor: p.color,
            animation: `petalFall ${p.duration}s ${p.delay}s linear infinite`,
          }} />
        ))}
      </div>

      {/* Main scene — single SVG, single coordinate system */}
      <div className="w-full" style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ display: "block", overflow: "visible" }}
          preserveAspectRatio="xMidYMax meet"
        >
          {/* Sky gradient */}
          <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="70%" stopColor="#e8f5e9" />
              <stop offset="100%" stopColor="#c8e6c9" />
            </linearGradient>
            <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7CB342" />
              <stop offset="100%" stopColor="#558B2F" />
            </linearGradient>
          </defs>

          {/* Sky fill */}
          <rect x={0} y={0} width={W} height={H} fill="url(#skyGrad)" />

          {/* Sun */}
          <g className="sun" style={{ transformOrigin: "810px 28px" }}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
              <line key={i}
                x1={810 + 18 * Math.cos(deg * Math.PI / 180)}
                y1={28 + 18 * Math.sin(deg * Math.PI / 180)}
                x2={810 + 30 * Math.cos(deg * Math.PI / 180)}
                y2={28 + 30 * Math.sin(deg * Math.PI / 180)}
                stroke="#FFD700" strokeWidth={3} strokeLinecap="round"
              />
            ))}
            <circle cx={810} cy={28} r={14} fill="#FFD700" />
          </g>

          {/* ---- TREES (trunk bottom = groundY) ---- */}

          {/* Far left — cherry blossom (pink) */}
          {renderTree(80, 90, 12, 44, 34, "#ffb7c5", "#ffd0de", 0.2)}

          {/* Left-center — green leafy */}
          {renderTree(220, 70, 10, 34, 28, "#66BB6A", "#81C784", 0.5)}

          {/* Center — tall cherry blossom */}
          {renderTree(450, 100, 14, 50, 40, "#f48fb1", "#ffb7c5", 0.8)}

          {/* Right-center — green leafy */}
          {renderTree(680, 75, 10, 36, 30, "#4CAF50", "#66BB6A", 0.4)}

          {/* Far right — cherry blossom */}
          {renderTree(820, 85, 12, 42, 32, "#ffc8d5", "#ff9eb5", 0.15)}

          {/* ---- FLOWERS (stem bottom = groundY) ---- */}
          {renderFlower(145, "#FF5722", "#FFEB3B", 22, 9, 0.9)}
          {renderFlower(165, "#9C27B0", "#FFF9C4", 18, 8, 1.1)}
          {renderFlower(185, "#E91E63", "#FFEB3B", 24, 9, 0.7)}
          {renderFlower(310, "#FF9800", "#FFFFFF", 19, 8, 1.2)}
          {renderFlower(330, "#2196F3", "#FFF9C4", 21, 8, 0.85)}
          {renderFlower(560, "#FF5722", "#FFEB3B", 20, 9, 1.0)}
          {renderFlower(578, "#4CAF50", "#FFEB3B", 17, 7, 0.75)}
          {renderFlower(740, "#E91E63", "#FFF9C4", 23, 9, 0.95)}
          {renderFlower(760, "#FF9800", "#FFFFFF", 18, 8, 1.15)}

          {/* ---- GROUND ---- */}
          {/* Main ground block */}
          <rect x={0} y={groundY} width={W} height={H - groundY} fill="url(#grassGrad)" />

          {/* Grass bumps along the top of the ground */}
          <path
            d={`M0,${groundY} ` + Array.from({ length: 45 }, (_, i) => {
              const x = (i / 44) * W;
              const cpX = x + (W / 44) / 2;
              const cpY = groundY - 10 - Math.sin(i * 2.3) * 4;
              const endX = x + W / 44;
              return `Q${cpX},${cpY} ${endX},${groundY}`;
            }).join(' ') + ` L${W},${H} L0,${H} Z`}
            fill="#7CB342"
          />

          {/* Individual grass blades */}
          {Array.from({ length: 38 }, (_, i) => {
            const gx = 15 + (i / 37) * (W - 30) + (Math.sin(i * 7.3) * 8);
            const gh = 12 + Math.abs(Math.sin(i * 3.1)) * 10;
            const lean = -15 + Math.sin(i * 2.7) * 25;
            return (
              <line key={i}
                x1={gx} y1={groundY}
                x2={gx + Math.sin(lean * Math.PI / 180) * gh}
                y2={groundY - gh}
                stroke="#8BC34A" strokeWidth={2.2} strokeLinecap="round"
                style={{
                  animation: `grassBlade 0.5s ease-out ${0.3 + i * 0.025}s both`,
                  transformOrigin: `${gx}px ${groundY}px`,
                }}
              />
            );
          })}

          {/* ---- SIGN (centered, post bottom at groundY) ---- */}
          <g className="spring-sign" style={{ transform: `translateX(${W / 2}px)` }}>
            {/* Post */}
            <rect x={-4} y={groundY - 36} width={8} height={36} rx={3} fill="#8D6E63" />
            {/* Board */}
            <rect x={-82} y={groundY - 82} width={164} height={50} rx={8} fill="#F9A825" stroke="#E65100" strokeWidth={3} />
            {/* Nail dots */}
            {[[-72, groundY - 74], [72, groundY - 74], [-72, groundY - 38], [72, groundY - 38]].map(([nx, ny], i) => (
              <circle key={i} cx={nx} cy={ny} r={3.5} fill="#BF360C" />
            ))}
            {/* Text */}
            <text x={0} y={groundY - 58} textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900"
              fontSize={11} letterSpacing={2} fill="#BF360C">SPRING BREAK</text>
            <text x={0} y={groundY - 40} textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900"
              fontSize={20} fill="#1B5E20">2026</text>
          </g>

          {/* ---- BEE ---- */}
          <g className="bee" style={{ transformOrigin: "390px 95px" }}>
            <ellipse cx={390} cy={97} rx={9} ry={6} fill="#FFD600" />
            <rect x={383} y={95} width={3} height={7} rx={1} fill="#212121" opacity={0.6} />
            <rect x={388} y={95} width={3} height={7} rx={1} fill="#212121" opacity={0.6} />
            <rect x={393} y={95} width={3} height={7} rx={1} fill="#212121" opacity={0.6} />
            <ellipse cx={385} cy={92} rx={6} ry={3.5} fill="white" opacity={0.75} />
            <ellipse cx={395} cy={92} rx={6} ry={3.5} fill="white" opacity={0.75} />
          </g>
        </svg>
      </div>
    </>
  );
}
