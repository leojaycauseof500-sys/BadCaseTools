import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EditorPage } from './components/Layout/EditorPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
