import { useEffect, useRef, useCallback } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';
import { useSessionStore } from '@/stores/sessionStore';
import { useToastStore } from '@/stores/toastStore';

/**
 * Hook that connects to a live session via Socket.IO and wires
 * all server events to the Zustand session store.
 */
export function useSessionSocket(sessionId: string | undefined) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const store = useSessionStore;
  const addToast = useToastStore.getState().addToast;

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    timerRef.current = null;
    heartbeatRef.current = null;
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const socket = getSocket();

    // ── Event handlers ──────────────────────────────────────────────
    const onConnect = () => {
      store.getState().setConnected(true);
      socket.emit('session:join', { sessionId });
      // Start heartbeat every 15s
      heartbeatRef.current = setInterval(() => {
        socket.emit('presence:heartbeat', { sessionId });
      }, 15_000);
    };

    const onDisconnect = () => {
      store.getState().setConnected(false);
      cleanup();
    };

    // Session lifecycle
    const onStatusChanged = (data: { sessionId: string; status: string; currentRound: number }) => {
      store.getState().setSessionStatus(data.status, data.currentRound);
      if (data.status === 'paused') store.getState().setPaused(true);
      else if (data.status === 'active') store.getState().setPaused(false);
    };

    const onRoundStarted = (data: { sessionId: string; roundNumber: number; endsAt: string }) => {
      store.getState().setSessionStatus('active', data.roundNumber);
      const secondsLeft = Math.max(0, Math.floor((new Date(data.endsAt).getTime() - Date.now()) / 1000));
      store.getState().setTimer(secondsLeft, secondsLeft, 'conversation');
      startTimer();
    };

    const onRoundEnding = (data: { sessionId: string; roundNumber: number; secondsLeft: number }) => {
      store.getState().setTimer(data.secondsLeft, store.getState().timerTotalSeconds, 'ending');
    };

    const onRoundEnded = (_data: { sessionId: string; roundNumber: number }) => {
      store.getState().setMatch(null, null, null);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    const onCompleted = (_data: { sessionId: string }) => {
      store.getState().setSessionStatus('completed', store.getState().currentRound);
      cleanup();
    };

    // Matching
    const onMatchAssigned = (data: { matchId: string; partnerId: string; roomId: string; roundNumber: number }) => {
      store.getState().setMatch(data.matchId, data.partnerId, data.roomId);
      store.getState().setSessionStatus('active', data.roundNumber);
    };

    const onByeRound = (data: { roundNumber: number; reason: string }) => {
      store.getState().setMatch(null, null, null);
      addToast({ type: 'info', title: 'Bye Round', message: data.reason });
    };

    const onReassigned = (data: { matchId: string; newPartnerId: string; roomId: string }) => {
      store.getState().setMatch(data.matchId, data.newPartnerId, data.roomId);
      addToast({ type: 'info', title: 'Partner Reassigned', message: 'You have been matched with a new partner.' });
    };

    // Participants
    const onParticipantJoined = (data: { userId: string; displayName: string }) => {
      store.getState().setParticipantCount(store.getState().participantCount + 1);
      addToast({ type: 'info', title: `${data.displayName} joined` });
    };

    const onParticipantLeft = (_data: { userId: string }) => {
      store.getState().setParticipantCount(Math.max(0, store.getState().participantCount - 1));
    };

    const onParticipantCount = (data: { count: number }) => {
      store.getState().setParticipantCount(data.count);
    };

    // Rating
    const onRatingWindowOpen = (data: { matchId: string; partnerId: string; roundNumber: number; durationSeconds: number }) => {
      store.getState().openRatingWindow(data.matchId, data.partnerId, data.roundNumber);
      store.getState().setTimer(data.durationSeconds, data.durationSeconds, 'rating');
      startTimer();
    };

    const onRatingWindowClosed = (_data: { roundNumber: number }) => {
      store.getState().closeRatingWindow();
    };

    // Host
    const onBroadcast = (data: { message: string; sentAt: string }) => {
      store.getState().setBroadcast(data.message, data.sentAt);
      addToast({ type: 'info', title: 'Host Message', message: data.message });
    };

    const onRemoved = (data: { userId: string; reason: string }) => {
      addToast({ type: 'warning', title: 'Participant Removed', message: data.reason });
    };

    // Timer sync
    const onTimerSync = (data: { segmentType: string; secondsRemaining: number; totalSeconds: number }) => {
      store.getState().setTimer(data.secondsRemaining, data.totalSeconds, data.segmentType);
    };

    // Errors
    const onError = (data: { code: string; message: string }) => {
      addToast({ type: 'error', title: `Error: ${data.code}`, message: data.message });
    };

    // ── Timer helper ────────────────────────────────────────────────
    function startTimer() {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const remaining = store.getState().timerSecondsRemaining;
        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          return;
        }
        store.getState().tickTimer();
      }, 1000);
    }

    // ── Register listeners ──────────────────────────────────────────
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('session:status_changed', onStatusChanged);
    socket.on('session:round_started', onRoundStarted);
    socket.on('session:round_ending', onRoundEnding);
    socket.on('session:round_ended', onRoundEnded);
    socket.on('session:completed', onCompleted);
    socket.on('match:assigned', onMatchAssigned);
    socket.on('match:bye_round', onByeRound);
    socket.on('match:reassigned', onReassigned);
    socket.on('participant:joined', onParticipantJoined);
    socket.on('participant:left', onParticipantLeft);
    socket.on('participant:count', onParticipantCount);
    socket.on('rating:window_open', onRatingWindowOpen);
    socket.on('rating:window_closed', onRatingWindowClosed);
    socket.on('host:broadcast', onBroadcast);
    socket.on('host:participant_removed', onRemoved);
    socket.on('timer:sync', onTimerSync);
    socket.on('error', onError);

    // Connect & set active session
    store.getState().setActiveSession(sessionId);
    connectSocket();

    return () => {
      socket.emit('session:leave', { sessionId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('session:status_changed', onStatusChanged);
      socket.off('session:round_started', onRoundStarted);
      socket.off('session:round_ending', onRoundEnding);
      socket.off('session:round_ended', onRoundEnded);
      socket.off('session:completed', onCompleted);
      socket.off('match:assigned', onMatchAssigned);
      socket.off('match:bye_round', onByeRound);
      socket.off('match:reassigned', onReassigned);
      socket.off('participant:joined', onParticipantJoined);
      socket.off('participant:left', onParticipantLeft);
      socket.off('participant:count', onParticipantCount);
      socket.off('rating:window_open', onRatingWindowOpen);
      socket.off('rating:window_closed', onRatingWindowClosed);
      socket.off('host:broadcast', onBroadcast);
      socket.off('host:participant_removed', onRemoved);
      socket.off('timer:sync', onTimerSync);
      socket.off('error', onError);
      cleanup();
      disconnectSocket();
      store.getState().reset();
    };
  }, [sessionId, addToast, cleanup, store]);
}
