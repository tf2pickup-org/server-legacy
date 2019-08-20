export interface GamePlayer {
  playerId: string;
  teamId: string;
  gameClass: string;
  status: 'active' | 'waiting for substitute' | 'replaced';
}
