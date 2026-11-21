import { Bot } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function getLastAnalysis() {
  try {
    return JSON.parse(sessionStorage.getItem("repoverse-last-analysis") || "null");
  } catch {
    return null;
  }
}

export default function AIAssistantShortcut() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const analysis = getLastAnalysis();

  if (!user || pathname.startsWith("/ai/") || !analysis?.id) return null;

  return (
    <Link
      className="ai-assistant-shortcut"
      to={`/ai/${encodeURIComponent(analysis.id)}`}
      aria-label="Open AI assistant"
      title="Open AI assistant"
    >
      <Bot size={23} aria-hidden="true" />
    </Link>
  );
}