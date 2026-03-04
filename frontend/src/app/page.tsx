'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, ArrowRight } from 'lucide-react';
import { generateRoomId } from '@/lib/roomUtils';

export default function HomePage() {
  const router = useRouter();
  const [joinId, setJoinId] = useState('');

  const handleCreateRoom = () => {
    const roomId = generateRoomId();
    router.push(`/room/${roomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinId.trim();
    if (trimmed) {
      router.push(`/room/${trimmed}`);
    }
  };

  return (
    <div className="landing-container">
      <div className="landing-bg-glow" />
      <div className="landing-content">
        <h1 className="logo">Skratch</h1>
        <p className="tagline">
          A lightweight real-time collaborative whiteboard.
          <br />
          Draw, sketch, and brainstorm together — no account needed.
        </p>

        <div className="action-card">
          <button
            id="create-room-btn"
            className="btn-primary"
            onClick={handleCreateRoom}
          >
            <Pencil size={18} />
            Create New Room
          </button>

          <div className="divider">or join an existing room</div>

          <form className="join-form" onSubmit={handleJoinRoom}>
            <input
              id="join-room-input"
              className="input-field"
              type="text"
              placeholder="Enter room ID..."
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
            />
            <button
              id="join-room-btn"
              type="submit"
              className="btn-secondary"
            >
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
