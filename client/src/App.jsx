import { Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ImportRepository from "./pages/ImportRepository";
import RepositoryAnalysis from "./pages/RepositoryAnalysis";
import Visualization3D from "./pages/Visualization3D";
import ApiAnalyzer from "./pages/ApiAnalyzer";
import AIAssistant from "./pages/AIAssistant";
import ErrorAnalysis from "./pages/ErrorAnalysis";
import RepositoryHistory from "./pages/RepositoryHistory";
import Reports from "./pages/Reports";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const privatePage = (Page) => (
  <ProtectedRoute>
    <Page />
  </ProtectedRoute>
);
export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={privatePage(Dashboard)} />
        <Route path="/import" element={privatePage(ImportRepository)} />
        <Route
          path="/analysis/:analysisId"
          element={privatePage(RepositoryAnalysis)}
        />
        <Route
          path="/visualization/:analysisId"
          element={privatePage(Visualization3D)}
        />
        <Route path="/apis/:analysisId" element={privatePage(ApiAnalyzer)} />
        <Route path="/ai/:analysisId" element={privatePage(AIAssistant)} />
        <Route
          path="/issues/:analysisId"
          element={privatePage(ErrorAnalysis)}
        />
        <Route path="/reports/:analysisId" element={privatePage(Reports)} />
        <Route path="/history" element={privatePage(RepositoryHistory)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
