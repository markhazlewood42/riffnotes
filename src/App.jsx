import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import SongBrowser from "./pages/SongBrowser";
import SongEditor from "./pages/SongEditor";
import "./styles/variables.css";

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
        </Route>
      </Routes>
    </>
  );
}

export default App;
