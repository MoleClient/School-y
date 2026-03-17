import { useEffect } from "react";
import { X } from "lucide-react";
import { SchoolyLogo } from "./schooly-logo";

export function StorePopup({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
      data-testid="overlay-store"
    >
      <div
        className="bg-background rounded-2xl shadow-xl px-8 py-8 max-w-sm w-full mx-4 relative"
        onClick={(e) => e.stopPropagation()}
        data-testid="popup-store"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted text-muted-foreground"
          data-testid="button-close-store"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="mb-4 flex justify-center">
          <SchoolyLogo size="small" />
        </div>
        <h2 className="text-lg font-semibold text-center text-foreground mb-2">School-y Store</h2>
        <p className="text-center text-muted-foreground text-sm leading-relaxed">
          Talk To Me If You Want Unlimited Access
        </p>
        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm rounded-full text-white"
            style={{ background: "linear-gradient(135deg, #4285F4, #6B72CF)" }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
