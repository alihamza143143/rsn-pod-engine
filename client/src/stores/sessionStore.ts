import { create } from 'zustand';

interface Participant {
  userId: string;
  displayName?: string;
}

interface MatchPartner {
  userId: string;
  displayName?: string;
}

type SessionPhase = 'lobby' | 'matched' | 'rating' | 'complete';

interface SessionLiveState {
  phase: SessionPhase;
  participants: Participant[];
  currentMatch: MatchPartner | null;
  timerSeconds: number;
  currentRound: number;

  setPhase: (phase: SessionPhase) => void;
  setParticipants: (p: Participant[]) => void;
  addParticipant: (p: Participant) => void;
  removeParticipant: (userId: string) => void;
  setMatch: (m: MatchPartner | null) => void;
  setTimer: (s: number) => void;
  tickTimer: () => void;
  setRound: (r: number) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionLiveState>((set) => ({
  phase: 'lobby',
  participants: [],
  currentMatch: null,
  timerSeconds: 0,
  currentRound: 1,

  setPhase: (phase) => set({ phase }),
  setParticipants: (participants) => set({ participants }),
  addParticipant: (p) => set((s) => ({
    participants: s.participants.some(x => x.userId === p.userId) ? s.participants : [...s.participants, p],
  })),
  removeParticipant: (userId) => set((s) => ({
    participants: s.participants.filter(x => x.userId !== userId),
  })),
  setMatch: (currentMatch) => set({ currentMatch }),
  setTimer: (timerSeconds) => set({ timerSeconds }),
  tickTimer: () => set((s) => ({ timerSeconds: Math.max(0, s.timerSeconds - 1) })),
  setRound: (currentRound) => set({ currentRound }),
  reset: () => set({ phase: 'lobby', participants: [], currentMatch: null, timerSeconds: 0, currentRound: 1 }),
}));
