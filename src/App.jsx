import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DrawPage from './pages/DrawPage';
import AdminPage from './pages/AdminPage';
import AdminSessionsPage from './pages/AdminSessionsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/draw/:sessionId" element={<DrawPage />} />
        <Route path="/admin" element={<AdminSessionsPage />} />
        <Route path="/admin/:sessionId" element={<AdminPage />} />
        <Route path="/" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
