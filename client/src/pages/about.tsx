import { useLocation } from "wouter";
import { SchoolyLogo } from "@/components/schooly-logo";
import { SpringScene } from "@/components/spring-scene";
import { ArrowLeft } from "lucide-react";

export default function AboutPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-background">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-about-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <SchoolyLogo size="small" onClick={() => setLocation("/")} />
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="flex justify-center mb-8">
            <SchoolyLogo size="large" />
          </div>

          <div className="space-y-6 text-center">
            <h1 className="text-2xl font-semibold text-foreground">About School-y</h1>
            <p className="text-muted-foreground leading-relaxed">
              School-y is a Google-inspired web browser built for students. Search the web, browse freely, and get AI-powered answers — all in one clean interface.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { title: "Real Search Results", desc: "Powered by DuckDuckGo — no tracking, no API keys needed." },
              { title: "AI Overview", desc: "Get instant AI summaries for any search query using cutting-edge models." },
              { title: "Built-in Browser", desc: "Visit any website through the integrated proxy browser without leaving School-y." },
              { title: "Spring Break 2026", desc: "Celebrating spring with an animated homepage scene — enjoy the season!" },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-medium text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center text-sm text-muted-foreground">
            <p>School-y &copy; Spring 2026 &nbsp;&middot;&nbsp; Built with love for students everywhere</p>
          </div>
        </div>

        <SpringScene />
      </div>
    </div>
  );
}
