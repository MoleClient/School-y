import { useEffect, useRef } from "react";

export default function TrollScreen() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startedRef = useRef(false);

  const startAudio = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const schedule = () => {
        const now = ctx.currentTime;
        const freqs = [880, 660, 880, 440, 880, 1100];
        let t = now;
        freqs.forEach((f) => {
          const osc = ctx.createOscillator();
          const dist = ctx.createWaveShaper();
          const gain = ctx.createGain();

          const curve = new Float32Array(256);
          for (let i = 0; i < 256; i++) {
            const x = (i * 2) / 256 - 1;
            curve[i] = ((Math.PI + 800) * x) / (Math.PI + 800 * Math.abs(x));
          }
          dist.curve = curve;

          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(f, t);
          gain.gain.setValueAtTime(0.9, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.18);

          osc.connect(dist);
          dist.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + 0.2);
          t += 0.22;
        });

        const loopDelay = t - now + 0.1;
        setTimeout(schedule, loopDelay * 1000);
      };

      schedule();
    } catch {}
  };

  useEffect(() => {
    startAudio();

    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      startAudio();
    };
    const onClick = () => startAudio();

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("click", onClick, true);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: "#000", fontFamily: "monospace" }}
      onClick={startAudio}
    >
      <style>{`
        @keyframes glitch {
          0%   { text-shadow: 3px 0 #ff0000, -3px 0 #00ffff; transform: translate(0,0) skewX(0deg); }
          10%  { text-shadow: -4px 0 #ff0000, 4px 0 #00ffff; transform: translate(-4px,2px) skewX(-2deg); }
          20%  { text-shadow: 4px 0 #ff0000, -4px 0 #00ffff; transform: translate(4px,-2px) skewX(3deg); }
          30%  { text-shadow: -3px 0 #ff0000, 3px 0 #00ffff; transform: translate(0,0) skewX(0deg); }
          40%  { text-shadow: 6px 0 #ff0000, -6px 0 #00ffff; transform: translate(6px,0) skewX(-4deg); }
          50%  { text-shadow: -5px 0 #ff0000, 5px 0 #00ffff; transform: translate(-5px,3px) skewX(2deg); }
          60%  { text-shadow: 3px 0 #ff0000, -3px 0 #00ffff; transform: translate(0,0) skewX(0deg); }
          70%  { text-shadow: -7px 0 #ff0000, 7px 0 #00ffff; transform: translate(-3px,-3px) skewX(-5deg); }
          80%  { text-shadow: 5px 0 #ff0000, -5px 0 #00ffff; transform: translate(3px,3px) skewX(3deg); }
          90%  { text-shadow: -4px 0 #ff0000, 4px 0 #00ffff; transform: translate(0,0) skewX(0deg); }
          100% { text-shadow: 3px 0 #ff0000, -3px 0 #00ffff; transform: translate(0,0) skewX(0deg); }
        }
        @keyframes scanline {
          0%   { top: -5%; }
          100% { top: 105%; }
        }
        @keyframes strobe {
          0%,49%  { background: #000; }
          50%,74% { background: #1a0000; }
          75%,89% { background: #000; }
          90%,100%{ background: #200000; }
        }
        @keyframes shake {
          0%,100% { transform: translate(0,0); }
          10%     { transform: translate(-3px,-2px); }
          20%     { transform: translate(3px,2px); }
          30%     { transform: translate(-2px,3px); }
          40%     { transform: translate(2px,-3px); }
          50%     { transform: translate(-4px,0); }
          60%     { transform: translate(4px,2px); }
          70%     { transform: translate(-2px,-2px); }
          80%     { transform: translate(3px,3px); }
          90%     { transform: translate(-3px,0); }
        }
        @keyframes skullpulse {
          0%,100% { filter: drop-shadow(0 0 0px #ff0000); transform: scale(1); }
          50%     { filter: drop-shadow(0 0 30px #ff0000) drop-shadow(0 0 60px #ff0000); transform: scale(1.12); }
        }
        @keyframes bar-flicker {
          0%,100% { opacity: 1; }
          48%     { opacity: 1; }
          50%     { opacity: 0.2; }
          52%     { opacity: 1; }
          78%     { opacity: 1; }
          80%     { opacity: 0.1; }
          82%     { opacity: 1; }
        }
        .troll-glitch {
          animation: glitch 0.3s steps(1) infinite, shake 0.15s linear infinite;
        }
        .troll-skull {
          animation: skullpulse 0.6s ease-in-out infinite;
        }
        .troll-bg {
          animation: strobe 0.4s steps(1) infinite;
        }
        .troll-scanline {
          position: fixed;
          left: 0; right: 0;
          height: 8px;
          background: rgba(255,0,0,0.18);
          animation: scanline 1.2s linear infinite;
          pointer-events: none;
        }
        .troll-bar {
          animation: bar-flicker 0.5s steps(1) infinite;
        }
      `}</style>

      <div className="troll-bg fixed inset-0 z-0" />
      <div className="troll-scanline z-10" />

      <div className="relative z-20 flex flex-col items-center gap-6 px-8 text-center">
        <div className="troll-skull text-[140px] leading-none">💀</div>

        <div
          className="troll-glitch"
          style={{
            fontSize: "clamp(60px, 12vw, 110px)",
            fontWeight: 900,
            color: "#ff0000",
            letterSpacing: "0.08em",
            lineHeight: 1,
          }}
        >
          LOCK IN
        </div>

        <div
          className="troll-bar"
          style={{
            fontSize: "clamp(16px, 3vw, 26px)",
            color: "#ff4444",
            letterSpacing: "0.25em",
            marginTop: 8,
          }}
        >
          &gt;&gt;&gt; YOU ARE DONE &lt;&lt;&lt;
        </div>

        <div
          style={{
            fontSize: "13px",
            color: "#550000",
            letterSpacing: "0.15em",
            marginTop: 4,
          }}
        >
          SESSION TERMINATED — NO ESCAPE
        </div>
      </div>
    </div>
  );
}
