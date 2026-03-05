import { create } from 'zustand';

interface SessionLiveState {
  // Connection
  isConnected: boolean;
  // Session state
  activeSessionId: string | null;
  sessionStatus: string;
  currentRound: number;
  isPaused: boolean;
  // Timer
  timerSecondsRemaining: number;
  timerTotalSeconds: number;
  timerSegmentType: string;
  // Match
  currentMatchId: string | null;
  currentPartnerId: string | null;
  currentRoomId: string | null;
  // Participants
  participantCount: number;
  // Rating
  ratingWindowOpen: boolean;
  ratingMatchId: string | null;
  ratingPartnerId: string | null;
  ratingRoundNumber: number;
  // Host broadcast
  lastBroadcast: { message: string; sentAt: string } | null;

  // Actions
  setConnected: (v: boolean) => void;
  setActiveSession: (id: string | null) => void;
  setSessionStatus: (status: string, round: number) => void;
  setPaused: (v: boolean) => void;
  setTimer: (remaining: number, total: number, segment: string) => void;
  tickTimer: () => void;
  setMatch: (matchId: string | null, partnerId: string | null, roomId: string | null) => void;
  setParticipantCount: (count: number) => void;
  openRatingWindow: (matchId: string, partnerId: string, roundNumber: number) => void;
  closeRatingWindow: () => void;
  setBroadcast: (message: string, sentAt: string) => void;
  reset: () => void;
}

const initialState = {
  isConnected: false,
  activeSessionId: null,
  sessionStatus: 'scheduled',
  currentRound: 0,
  isPaused: false,
  timerSecondsRemaining: 0,
  timerTotalSeconds: 0,
  timerSegmentType: '',
  currentMatchId: null,
  currentPartnerId: null,
  currentRoomId: null,
  participantCount: 0,
  ratingWindowOpen: false,
  ratingMatchId: null,
  ratingPartnerId: null,
  ratingRoundNumber: 0,
  lastBroadcast: null,
};

export const useSessionStore = create<SessionLiveState>((set) => ({
  ...initialState,

  setConnected: (v) => set({ isConnected: v }),
  setActiveSession: (id) => set({ activeSessionId: id }),
  setSessionStatus: (status, round) => set({ sessionStatus: status, currentRound: round }),
  setPaused: (v) => set({ isPaused: v }),
  setTimer: (remaining, total, segment) => set({
    timerSecondsRemaining: remaining,
    timerTotalSeconds: total,
    timerSegmentType: segment,
  }),
  tickTimer: () => set((s) => ({
    timerSecondsRemaining: Math.max(0, s.timerSecondsRemaining - 1),
  })),
  setMatch: (matchId, partnerId, roomId) => set({
    currentMatchId: matchId,
    currentPartnerId: partnerId,
    currentRoomId: roomId,
  }),
  setParticipantCount: (count) => set({ participantCount: count }),
  openRatingWindow: (matchId, partnerId, roundNumber) => set({
    ratingWindowOpen: true,
    ratingMatchId: matchId,
    ratingPartnerId: partnerId,
    ratingRoundNumber: roundNumber,
  }),
  closeRatingWindow: () => set({
    ratingWindowOpen: false,
    ratingMatchId: null,
    ratingPartnerId: null,
    ratingRoundNumber: 0,
  }),
  setBroadcast: (message, sentAt) => set({ lastBroadcast: { message, sentAt } }),
  reset: () => set(initialState),
}));
