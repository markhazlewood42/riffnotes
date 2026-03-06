import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SongBrowser from './pages/SongBrowser';
import SongEditor from './pages/SongEditor';
import './styles/variables.css';
import './styles/annotations.css';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<SongBrowser />} />
        <Route path="/songs/:id" element={<SongEditor />} />
      </Route>
    </Routes>
  );
}

export default App;
