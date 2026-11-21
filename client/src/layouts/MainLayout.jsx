import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AIAssistantShortcut from "../components/AIAssistantShortcut";
export default function MainLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="flex-grow-1">
        <Outlet />
      </main>
      <Footer />
      <AIAssistantShortcut />
    </div>
  );
}
