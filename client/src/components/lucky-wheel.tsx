import { useState, useRef, useEffect } from "react";

interface LuckyWheelProps {
  onClose: () => void;
}

const SEGMENTS = [
  { label: "Try Again", color: "#4285F4", textColor: "#fff" },
  { label: "Better Luck\nNext Time", color: "#EA4335", textColor: "#fff" },
  { label: "Almost!", color: "#FBBC05", textColor: "#333" },
  { label: "Free Unlimited\nAI Usage", color: "#34A853", textColor: "#fff" },
  { label: "Nope", color: "#4285F4", textColor: "#fff" },
  { label: "Keep\nDreaming", color: "#EA4335", textColor: "#fff" },
  { label: "So Close!", color: "#FBBC05", textColor: "#333" },
  { label: "Not Today", color: "#34A853", textColor: "#fff" },
  { label: "Spin Again?", color: "#4285F4", textColor: "#fff" },
  { label: "Womp Womp", color: "#EA4335", textColor: "#fff" },
  { label: "No Thanks", color: "#FBBC05", textColor: "#333" },
  { label: "Next Time!", color: "#34A853", textColor: "#fff" },
];

const LUCKY_INDEX = 3;
const NUM = SEGMENTS.length;
const SEGMENT_ANGLE = 360 / NUM;

function drawWheel(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const cx = W / 2;
  const cy = W / 2;
  const r = cx - 8;

  ctx.clearRect(0, 0, W, W);

  SEGMENTS.forEach((seg, i) => {
    const startAngle = (i * SEGMENT_ANGLE - 90) * (Math.PI / 180);
    const endAngle = ((i + 1) * SEGMENT_ANGLE - 90) * (Math.PI / 180);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((startAngle + endAngle) / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = seg.textColor;
    ctx.font = "bold 11px Arial, sans-serif";
    const lines = seg.label.split("\n");
    lines.forEach((line, li) => {
      ctx.fillText(line, r - 14, (li - (lines.length - 1) / 2) * 14);
    });
    ctx.restore();
  });

  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#888";
  ctx.fill();
}

export function LuckyWheel({ onClose }: LuckyWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [showClaim, setShowClaim] = useState(false);
  const [womp, setWomp] = useState(false);
  const [confetti, setConfetti] = useState<Array<{ x: number; y: number; color: string; size: number; vel: number; hvel: number }>>([]);
  const animRef = useRef<number>(0);
  const rotRef = useRef(0);

  useEffect(() => {
    if (canvasRef.current) drawWheel(canvasRef.current);
  }, []);

  const spin = () => {
    if (spinning) return;
    setResult(null);
    setShowClaim(false);
    setWomp(false);
    setConfetti([]);

    // 5% chance of lucky
    const isLucky = Math.random() < 0.05;
    const targetSegment = isLucky ? LUCKY_INDEX : (() => {
      let idx = Math.floor(Math.random() * (NUM - 1));
      if (idx >= LUCKY_INDEX) idx++;
      return idx;
    })();

    // Compute target rotation: land needle (top = 270°) on segment center
    const segCenter = targetSegment * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const currentMod = ((rotRef.current % 360) + 360) % 360;
    let delta = (360 - segCenter - currentMod + 360) % 360;
    if (delta < 30) delta += 360;
    const totalRotation = rotRef.current + 5 * 360 + delta;

    setSpinning(true);
    const start = performance.now();
    const duration = 4500;
    const from = rotRef.current;

    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = t < 1 ? 1 - Math.pow(1 - t, 4) : 1;
      const cur = from + (totalRotation - from) * ease;
      rotRef.current = cur;
      setRotation(cur);
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        rotRef.current = totalRotation;
        setSpinning(false);
        const landed = SEGMENTS[targetSegment].label.replace("\n", " ");
        setResult(landed);
        if (isLucky) {
          setShowClaim(true);
          // Spawn confetti
          const pieces = Array.from({ length: 60 }, () => ({
            x: 200 + (Math.random() - 0.5) * 100,
            y: 200 + (Math.random() - 0.5) * 100,
            color: ["#4285F4", "#EA4335", "#FBBC05", "#34A853"][Math.floor(Math.random() * 4)],
            size: 6 + Math.random() * 8,
            vel: -8 - Math.random() * 6,
            hvel: (Math.random() - 0.5) * 6,
          }));
          setConfetti(pieces);
          setTimeout(() => setConfetti([]), 2500);
        }
      }
    };
    animRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const handleClaim = () => {
    setShowClaim(false);
    setWomp(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-4 max-w-sm w-full mx-4 relative overflow-hidden">
        <h2 className="text-xl font-bold text-foreground">I'm Feeling Lucky</h2>
        <p className="text-sm text-muted-foreground text-center">Spin the wheel for a chance to win something amazing!</p>

        {/* Confetti layer */}
        {confetti.length > 0 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {confetti.map((p, i) => (
              <div
                key={i}
                className="absolute rounded-sm"
                style={{
                  left: p.x,
                  top: p.y,
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  animation: `confetti-fall 2s ease-out forwards`,
                  animationDelay: `${Math.random() * 0.3}s`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
          </div>
        )}

        {/* Wheel container */}
        <div className="relative">
          {/* Needle */}
          <div
            className="absolute left-1/2 -translate-x-1/2 z-10"
            style={{ top: -8 }}
          >
            <div style={{
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "24px solid #EA4335",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
            }} />
          </div>
          <canvas
            ref={canvasRef}
            width={360}
            height={360}
            style={{ transform: `rotate(${rotation}deg)`, display: "block" }}
          />
        </div>

        {/* Result banner */}
        {result && !womp && (
          <div className={`text-center rounded-xl px-4 py-2 w-full ${showClaim ? "bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800" : "bg-muted"}`}>
            <p className="font-semibold text-foreground">{result}</p>
            {showClaim && (
              <button
                onClick={handleClaim}
                className="mt-2 px-6 py-1.5 bg-green-500 text-white rounded-full text-sm font-semibold hover:bg-green-600 transition-colors"
                data-testid="button-claim-prize"
              >
                Claim Prize
              </button>
            )}
          </div>
        )}

        {/* Womp Womp */}
        {womp && (
          <div className="bg-[#EA4335]/10 border border-[#EA4335]/30 rounded-xl px-4 py-3 w-full text-center">
            <p className="text-2xl font-black text-[#EA4335]">Womp Womp</p>
            <p className="text-sm text-muted-foreground mt-1">This prize doesn't actually exist. Gotcha!</p>
          </div>
        )}

        <div className="flex gap-3 w-full">
          <button
            onClick={spin}
            disabled={spinning}
            className="flex-1 py-2 bg-[#4285F4] text-white rounded-full text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3367d6] transition-colors"
            data-testid="button-spin-wheel"
          >
            {spinning ? "Spinning..." : result ? "Spin Again" : "Spin!"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground rounded-full border border-border hover:bg-muted transition-colors"
            data-testid="button-close-wheel"
          >
            Close
          </button>
        </div>
      </div>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(200px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
