import { pickTeams, PlayerSlot } from './pick-teams';

describe('pickTeams', () => {
  describe('should mix teams properly', () => {
    it('for 4 slots', () => {
      const players: PlayerSlot[] = [
        { playerId: '0', gameClass: 'soldier', skill: 1 },
        { playerId: '1', gameClass: 'soldier', skill: 2 },
        { playerId: '2', gameClass: 'soldier', skill: 3 },
        { playerId: '3', gameClass: 'soldier', skill: 4 },
      ];
      const gameClasses = ['soldier'];

      const gamePlayers = pickTeams(players, gameClasses);
      expect(gamePlayers.length).toBe(4);
      expect(gamePlayers.filter(p => p.teamId === '0').length).toBe(2);
      expect(gamePlayers.find(p =>  p.playerId === '0').teamId).toBe('0');
      expect(gamePlayers.find(p =>  p.playerId === '3').teamId).toBe('0');
      expect(gamePlayers.filter(p => p.teamId === '1').length).toBe(2);
      expect(gamePlayers.find(p =>  p.playerId === '1').teamId).toBe('1');
      expect(gamePlayers.find(p =>  p.playerId === '2').teamId).toBe('1');
    });

    it('for 12 slots', () => {
      const players: PlayerSlot[] = [
        { playerId: '0', gameClass: 'scout', skill: 2 },
        { playerId: '1', gameClass: 'scout', skill: 2 },
        { playerId: '2', gameClass: 'scout', skill: 2 },
        { playerId: '3', gameClass: 'scout', skill: 2 },
        { playerId: '4', gameClass: 'soldier', skill: 4 },
        { playerId: '5', gameClass: 'soldier', skill: 4 },
        { playerId: '6', gameClass: 'soldier', skill: 5 },
        { playerId: '7', gameClass: 'soldier', skill: 4 },
        { playerId: '0', gameClass: 'demoman', skill: 1 },
        { playerId: '1', gameClass: 'demoman', skill: 3 },
        { playerId: '2', gameClass: 'medic', skill: 2 },
        { playerId: '3', gameClass: 'medic', skill: 4 },
      ];
      const gameClasses = ['scout', 'soldier', 'demoman', 'medic'];
      const gamePlayers = pickTeams(players, gameClasses);

      expect(gamePlayers.filter(p => p.teamId === '0').length).toBe(6);
      expect(gamePlayers.filter(p => p.teamId === '1').length).toBe(6);
    });
  });
});
