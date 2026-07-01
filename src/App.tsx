import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { HomePage, RoomGuard } from './pages/HomePage';
import { JoinPage } from './pages/JoinPage';
import { WaitingPage } from './pages/WaitingPage';
import { LobbyPage } from './pages/LobbyPage';
import { AuctionPage } from './pages/AuctionPage';
import { FinalPage } from './pages/FinalPage';
import { AdminPage, AdminAuctionPage } from './pages/AdminPage';
import './App.css';

function RoomRoute({ children }: { children: React.ReactNode }) {
  const { roomId } = useParams<{ roomId: string }>();
  if (!roomId) return <Navigate to="/" replace />;
  return <RoomGuard roomId={roomId}>{() => children}</RoomGuard>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/room/:roomId"
          element={
            <RoomRoute>
              <JoinPage />
            </RoomRoute>
          }
        />
        <Route
          path="/room/:roomId/waiting"
          element={
            <RoomRoute>
              <WaitingPage />
            </RoomRoute>
          }
        />
        <Route
          path="/room/:roomId/lobby"
          element={
            <RoomRoute>
              <LobbyPage />
            </RoomRoute>
          }
        />
        <Route
          path="/room/:roomId/auction"
          element={
            <RoomRoute>
              <AuctionPage />
            </RoomRoute>
          }
        />
        <Route
          path="/room/:roomId/final"
          element={
            <RoomRoute>
              <FinalPage />
            </RoomRoute>
          }
        />
        <Route
          path="/room/:roomId/admin"
          element={
            <RoomRoute>
              <AdminPage />
            </RoomRoute>
          }
        />
        <Route
          path="/room/:roomId/admin/auction"
          element={
            <RoomRoute>
              <AdminAuctionPage />
            </RoomRoute>
          }
        />

        {/* Legacy redirects */}
        <Route path="/admin" element={<Navigate to="/" replace />} />
        <Route path="/waiting" element={<Navigate to="/" replace />} />
        <Route path="/lobby" element={<Navigate to="/" replace />} />
        <Route path="/auction" element={<Navigate to="/" replace />} />
        <Route path="/final" element={<Navigate to="/" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
