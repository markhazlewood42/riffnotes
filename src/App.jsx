import { lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import AdminRoute from "./components/AdminRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import SongBrowser from "./pages/SongBrowser";
import SongEditor from "./pages/SongEditor";
import "./styles/page.css";
import "./styles/variables.css";

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true';
const TestEditor = AUTH_BYPASS ? lazy(() => import('./pages/TestEditor')) : null;

function App() {
  return (
    <>
      <SpeedInsights />
      <Analytics />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<SongBrowser />} />
          <Route path="/songs/:id" element={<SongEditor />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
        {TestEditor && (
          <Route path="/test" element={<Suspense><TestEditor /></Suspense>} />
        )}
      </Routes>
    </>
  );
}

export default App;
