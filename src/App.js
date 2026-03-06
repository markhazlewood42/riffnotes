import { Route, Routes } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import "./App.css";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import SongBrowser from "./pages/SongBrowser";
import SongEditor from "./pages/SongEditor";
import "./styles/annotations.css";
import "./styles/variables.css";

function App() {
  return (
    <>
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
