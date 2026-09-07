import React, { useState } from "react";
import { AuthProvider, useAuth } from "./config/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminPage from "./pages/AdminPage";
import AskPage from "./pages/AskPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ReportsPage from "./pages/ReportsPage";

const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

function AppInner() {
  const { user, role, loading, setRole } = useAuth();
  const [view, setView] = useState("dashboard"); // "dashboard"|"adminLogin"|"admin"|"ask"|"analytics"|"reports"

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center">
          <svg className="w-10 h-10 animate-spin text-cyan-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-slate-400 text-sm">Loading Link3 BTS Monitor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSuccess={() => setView("dashboard")} />;
  }

  if (view === "ask") {
    return <AskPage onBack={() => setView("dashboard")} />;
  }

  if (view === "analytics") {
    return <AnalyticsPage onBack={() => setView("dashboard")} />;
  }

  if (view === "reports") {
    return <ReportsPage onBack={() => setView("dashboard")} />;
  }

  if (view === "adminLogin") {
    return (
      <AdminLoginPage
        onSuccess={() => { setRole("admin"); setView("admin"); }}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "admin" && role === "admin") {
    return <AdminPage onBack={() => { setRole("monitor"); setView("dashboard"); }} />;
  }

  return (
    <DashboardPage
      onAdminClick={() => setView("adminLogin")}
      onAskClick={() => setView("ask")}
      onAnalyticsClick={() => setView("analytics")}
      onReportsClick={() => setView("reports")}
      onLogout={() => setView("dashboard")}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
