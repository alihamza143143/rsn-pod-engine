import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useSessionStore } from '@/stores/sessionStore';

export default function useSessionSocket(sessionId: string) {
  const {
    setPhase, addParticipant, removeParticipant,
    setMatch, setTimer, tickTimer, setRound,
  } = useSessionStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('rsn_access');
    if (!token || !sessionId) return;

    connectSocket(token);
    const socket = getSocket();

    socket.emit('session:join', { sessionId });

    socket.on('participant:joined', (data) => addParticipant({ userId: data.userId, displayName: data.displayName }));
    socket.on('participant:left', (data) => removeParticipant(data.userId));
    socket.on('participant:count', () => {
      // Update participant count — participants list managed via join/leave
    });

    socket.on('session:status_changed', (data) => {
      if (data.status === 'completed') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPhase('complete');
      }
      setRound(data.currentRound);
    });

    socket.on('session:round_started', (data) => {
      setRound(data.roundNumber);
      const duration = Math.floor((new Date(data.endsAt).getTime() - Date.now()) / 1000);
      setTimer(Math.max(0, duration));
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => tickTimer(), 1000);
    });

    socket.on('session:round_ended', () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPhase('rating');
    });

    socket.on('session:completed', () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPhase('complete');
    });

    socket.on('match:assigned', (data) => {
      setMatch({ userId: data.partnerId, displayName: data.partnerId });
      setPhase('matched');
    });

    socket.on('rating:window_open', () => {
      setPhase('rating');
    });

    socket.on('rating:window_closed', () => {
      setPhase('lobby');
    });

    socket.on('timer:sync', (data) => {
      setTimer(data.secondsRemaining);
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      socket.emit('session:leave', { sessionId });
      disconnectSocket();
    };
  }, [sessionId]);
}
