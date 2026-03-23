import { useEffect, useState, useCallback } from "react";

const CLOAK_KEY = "Alt+KeyC";

const FAKE_CLASSES = [
  {
    id: 1,
    name: "AP English Literature",
    section: "Period 3",
    teacher: "Mrs. Henderson",
    color: "#1E7E34",
    emoji: "📚",
  },
  {
    id: 2,
    name: "U.S. History",
    section: "Period 1",
    teacher: "Mr. Ortega",
    color: "#137333",
    emoji: "🏛️",
  },
  {
    id: 3,
    name: "Algebra II / Trigonometry",
    section: "Period 5",
    teacher: "Ms. Patel",
    color: "#0D652D",
    emoji: "📐",
  },
  {
    id: 4,
    name: "Chemistry Honors",
    section: "Period 2",
    teacher: "Dr. Williams",
    color: "#185ABC",
    emoji: "🧪",
  },
  {
    id: 5,
    name: "Spanish III",
    section: "Period 6",
    teacher: "Señora Gutierrez",
    color: "#A50E0E",
    emoji: "🌎",
  },
  {
    id: 6,
    name: "AP Computer Science",
    section: "Period 4",
    teacher: "Mr. Johnson",
    color: "#5C1010",
    emoji: "💻",
  },
];

const ASSIGNMENTS = [
  { class: "AP English Literature", task: "Essay Draft: The Great Gatsby", due: "Due tomorrow" },
  { class: "U.S. History", task: "Chapter 14 Reading Quiz", due: "Due Friday" },
  { class: "Algebra II / Trigonometry", task: "Problem Set 7: Trig Identities", due: "Due Monday" },
];

function GoogleClassroomIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
      <rect width="192" height="192" rx="18" fill="#34A853"/>
      <path d="M96 104c13.255 0 24-10.745 24-24S109.255 56 96 56 72 66.745 72 80s10.745 24 24 24z" fill="white"/>
      <path d="M144 128c0-13.255-21.49-24-48-24s-48 10.745-48 24v8h96v-8z" fill="white"/>
      <circle cx="152" cy="80" r="16" fill="white"/>
      <circle cx="40" cy="80" r="16" fill="white"/>
      <path d="M168 104c0-8.837-14.327-16-32-16v32c17.673 0 32-7.163 32-16z" fill="white" opacity="0.7"/>
      <path d="M24 104c0-8.837 14.327-16 32-16v32c-17.673 0-32-7.163-32-16z" fill="white" opacity="0.7"/>
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5F6368" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5F6368" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#5F6368">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function ClassCard({ cls }: { cls: typeof FAKE_CLASSES[0] }) {
  return (
    <div style={{
      borderRadius: "8px",
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      background: "white",
      cursor: "pointer",
      minHeight: "220px",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Google Sans', Roboto, Arial, sans-serif",
    }}>
      <div style={{
        background: cls.color,
        padding: "16px",
        height: "96px",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ color: "white", fontWeight: 600, fontSize: "16px", lineHeight: "1.3" }}>{cls.name}</div>
          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "13px", marginTop: "2px" }}>{cls.section}</div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px" }}>{cls.teacher}</div>
        </div>
        <div style={{
          position: "absolute",
          bottom: "-22px",
          right: "16px",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          background: "#fff",
          border: `3px solid ${cls.color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
        }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: cls.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
          }}>
            {cls.name[0]}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, padding: "28px 16px 8px" }} />
      <div style={{
        display: "flex",
        borderTop: "1px solid #e0e0e0",
        padding: "8px 16px",
        gap: "8px",
        justifyContent: "flex-end",
      }}>
        <div style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#5F6368">
            <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
          </svg>
        </div>
        <div style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#5F6368">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function CloakOverlay() {
  const [visible, setVisible] = useState(false);
  const [time, setTime] = useState(new Date());

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  const toggle = useCallback(() => setVisible(v => !v), []);

  useEffect(() => {
    const onBlur = () => show();
    const onFocus = () => {};
    const onVisibilityChange = () => {
      if (document.hidden) show();
    };

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyC") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape" && visible) {
        hide();
      }
    };
    window.addEventListener("keydown", onKey);

    const timer = setInterval(() => setTime(new Date()), 60000);

    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("keydown", onKey);
      clearInterval(timer);
    };
  }, [show, hide, toggle, visible]);

  const greeting = () => {
    const h = time.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "#f1f3f4",
        fontFamily: "'Google Sans', Roboto, Arial, sans-serif",
        overflowY: "auto",
        cursor: "default",
      }}
    >
      {/* Top nav */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "white",
        borderBottom: "1px solid #e0e0e0",
        height: "56px",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: "12px",
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}>
          <MenuIcon />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <GoogleClassroomIcon />
          <span style={{ fontSize: "20px", color: "#5F6368", fontWeight: 400 }}>Classroom</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}>
          <SearchIcon />
        </div>
        <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}>
          <GridIcon />
        </div>
        <div style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: "#1A73E8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: "15px",
          fontWeight: 600,
          cursor: "pointer",
          flexShrink: 0,
        }}>
          S
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 16px" }}>
        {/* To-do strip */}
        <div style={{
          background: "white",
          borderRadius: "8px",
          padding: "16px 20px",
          marginBottom: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        }}>
          <div style={{ fontSize: "13px", color: "#5F6368", marginBottom: "10px", fontWeight: 500 }}>
            {greeting()}, Student
          </div>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {ASSIGNMENTS.map((a, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                background: "#f8f9fa",
                borderRadius: "8px",
                cursor: "pointer",
                flex: "1",
                minWidth: "200px",
              }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#E8F0FE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1A73E8">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#202124" }}>{a.task}</div>
                  <div style={{ fontSize: "11px", color: "#5F6368" }}>{a.class} · <span style={{ color: "#D93025" }}>{a.due}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Classes grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "20px",
        }}>
          {FAKE_CLASSES.map(cls => (
            <ClassCard key={cls.id} cls={cls} />
          ))}
        </div>
      </div>

      {/* FAB */}
      <div style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        background: "#1A73E8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        cursor: "pointer",
        zIndex: 11,
      }}>
        <PlusIcon />
      </div>
    </div>
  );
}
