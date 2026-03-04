'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { User } from '@skratch/shared';

interface RoomHeaderProps {
    roomId: string;
    users: User[];
    connected: boolean;
}

export default function RoomHeader({ roomId, users, connected }: RoomHeaderProps) {
    const [copied, setCopied] = useState(false);

    const copyLink = useCallback(() => {
        const url = `${window.location.origin}/room/${roomId}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [roomId]);

    return (
        <div className="room-header" id="room-header">
            <div className="room-header-left">
                <span className="room-logo">Skratch</span>
                <div className="room-id-badge">
                    <span>{roomId}</span>
                    <button className="copy-btn" onClick={copyLink} title="Copy invite link">
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                </div>
                <div
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: connected ? 'var(--success)' : 'var(--error)',
                    }}
                    title={connected ? 'Connected' : 'Disconnected'}
                />
            </div>

            <div className="room-header-right">
                <div className="user-avatars">
                    {users.slice(0, 5).map((user) => (
                        <div
                            key={user.id}
                            className="user-avatar"
                            style={{ backgroundColor: user.color }}
                            title={user.name}
                        >
                            {user.name[0]?.toUpperCase()}
                        </div>
                    ))}
                </div>
                <span className="user-count">
                    {users.length} {users.length === 1 ? 'user' : 'users'}
                </span>
            </div>
        </div>
    );
}
