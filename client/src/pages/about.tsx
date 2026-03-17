import { useLocation } from "wouter";
import { SchoolyLogo } from "@/components/schooly-logo";
import { ArrowLeft } from "lucide-react";

export default function AboutPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center px-6 py-4 border-b border-border">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-about-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-6 py-16">
        <div className="mb-12">
          <SchoolyLogo size="small" />
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-4">About School-y</h1>
        <p className="text-base text-muted-foreground leading-relaxed mb-12">
          School-y is a web browser built for students. Search the web, browse freely, and get AI-powered answers — all from one place.
        </p>

        <div className="space-y-8">
          {[
            { title: "Search", desc: "Powered by DuckDuckGo. No tracking, no API keys, no nonsense." },
            { title: "AI Overview", desc: "Instant AI summaries appear at the top of search results for any query." },
            { title: "Built-in Browser", desc: "Visit any site through the proxy without leaving School-y." },
            { title: "School Messages", desc: "Group chat, direct messages, and reactions — all live, no refresh needed." },
            { title: "User Accounts", desc: "Create an account to save browsing history, customize your profile, and chat." },
          ].map((f) => (
            <div key={f.title}>
              <h3 className="text-sm font-semibold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground">School-y &copy; {new Date().getFullYear()}</p>
        </div>
      </main>
    </div>
  );
}
