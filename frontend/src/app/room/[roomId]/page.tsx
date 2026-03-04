'use client';

import { use } from 'react';
import Whiteboard from '@/components/whiteboard/Whiteboard';

interface RoomPageProps {
    params: Promise<{ roomId: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
    const { roomId } = use(params);

    return <Whiteboard roomId={roomId} />;
}
