import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { HomePage, RoomGuard } from './pages/HomePage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminCreateRoomPage } from './pages/AdminCreateRoomPage';
import { CaptainLoginPage } from './pages/CaptainLoginPage';
import { JoinPage } from './pages/JoinPage';
import { WaitingPage } from './pages/WaitingPage';
import { LobbyPage } from './pages/LobbyPage';
import { AuctionPage } from './pages/AuctionPage';
import { FinalPage } from './pages/FinalPage';
import { AdminPage, AdminAuctionPage } from './pages/AdminPage';
import { SpectatorPage } from './pages/SpectatorPage';
import { PlayersPage } from './pages/PlayersPage';
import { CaptainAuctionFaqPage } from './pages/CaptainAuctionFaqPage';
import './App.css';

function RoomRoute({ children }: { children: React.ReactNode }) {
  const { roomId } = useParams<{ roomId: string }>();
  if (!roomId) return <Navigate to="/" replace />;
  return <RoomGuard roomId={roomId}>{() => children}</RoomGuard>;
}

function App() {
  return (
    <>
      <Analytics />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/blog/captain-auction-faq" element={<CaptainAuctionFaqPage />} />
          <Route path="/create" element={<AdminCreateRoomPage />} />
          <Route path="/login/admin" element={<AdminLoginPage />} />

          <Route
            path="/room/:roomId/login"
            element={
              <RoomRoute>
                <CaptainLoginPage />
              </RoomRoute>
            }
          />
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
            path="/room/:roomId/players"
            element={
              <RoomRoute>
                <PlayersPage />
              </RoomRoute>
            }
          />
          <Route
            path="/room/:roomId/spectate"
            element={
              <RoomRoute>
                <SpectatorPage />
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
    </>
  );
}

export default App;
