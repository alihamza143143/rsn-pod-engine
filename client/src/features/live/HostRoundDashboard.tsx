import { useSessionStore } from '@/stores/sessionStore';
import { Clock, Wifi, WifiOff, UserMinus, Radio, AlertTriangle } from 'lucide-react';
import { getSocket } from '@/lib/socket';

interface Props { sessionId: string; }

export default function HostRoundDashboard({ sessionId }: Props) {
  const { roundDashboard, timerSeconds, currentRound, totalRounds } = useSessionStore();
  const socket = getSocket();

  const removeFromRoom = (matchId: string, userId: string) => {
    if (!confirm('Remove this participant from their current room? Their partner will get a bye.')) return;
    socket?.emit('host:remove_from_room' as any, { sessionId, matchId, userId });
  };

  if (!roundDashboard || roundDashboard.rooms.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-[#202124]">
        <div className="max-w-md w-full text-center bg-[#292a2d] rounded-2xl p-8">
          <Radio className="h-8 w-8 text-red-500 animate-pulse mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Round {currentRound} of {totalRounds}</h2>
          <p className="text-gray-400 text-sm">Setting up breakout rooms...</p>
        </div>
      </div>
    );
  }

  const activeRooms = roundDashboard.rooms.filter(r => r.status === 'active');

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-[#202124]">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="h-4 w-4 text-red-500 animate-pulse" />
            <h2 className="text-lg font-bold text-white">
              Round {currentRound} of {totalRounds}
            </h2>
            <span className="text-sm text-gray-400">
              {activeRooms.length} room{activeRooms.length !== 1 ? 's' : ''} active
            </span>
          </div>
          <div className="flex items-center gap-2 text-lg font-mono font-bold text-white">
            <Clock className="h-5 w-5 text-gray-400" />
            {formatTime(timerSeconds)}
          </div>
        </div>

        {/* Breakout Rooms Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {roundDashboard.rooms.map((room, idx) => (
            <div key={room.matchId} className={`rounded-xl p-3 ${room.status === 'no_show' ? 'opacity-60 bg-red-500/10 border border-red-500/20' : room.status === 'active' ? 'bg-[#292a2d] border border-green-500/20' : 'bg-[#292a2d] border border-white/10'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase">
                  Room {idx + 1}
                  {room.isTrio && <span className="ml-1 text-blue-400">(Trio)</span>}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  room.status === 'active' ? 'bg-green-500/10 text-green-400' :
                  room.status === 'no_show' ? 'bg-red-500/10 text-red-400' :
                  room.status === 'completed' ? 'bg-white/5 text-gray-500' :
                  'bg-amber-500/10 text-amber-400'
                }`}>
                  {room.status === 'active' ? 'Live' : room.status === 'no_show' ? 'Disconnected' : room.status}
                </span>
              </div>
              <div className="space-y-1.5">
                {room.participants.map(p => (
                  <div key={p.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {p.isConnected ? (
                        <Wifi className="h-3 w-3 text-green-400" />
                      ) : (
                        <WifiOff className="h-3 w-3 text-red-400" />
                      )}
                      <span className={`text-sm ${p.isConnected ? 'text-gray-300' : 'text-gray-500'}`}>
                        {p.displayName}
                      </span>
                    </div>
                    {room.status === 'active' && (
                      <button
                        onClick={() => removeFromRoom(room.matchId, p.userId)}
                        className="p-1 text-gray-600 hover:text-red-400 transition-colors rounded"
                        title={`Remove ${p.displayName} from room`}
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bye Participants */}
        {roundDashboard.byeParticipants.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-sm text-amber-400">
              Bye this round: {roundDashboard.byeParticipants.map(p => p.displayName).join(', ')}
            </span>
          </div>
        )}

        {/* Reassignment indicator */}
        {roundDashboard.reassignmentInProgress && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10">
            <Radio className="h-4 w-4 text-blue-400 animate-pulse" />
            <span className="text-sm text-blue-400">Reassignment in progress...</span>
          </div>
        )}
      </div>
    </div>
  );
}
