import { QueueSlot } from 'queue/models/queue-slot';
import { extractFriends } from './extract-friends';

describe('extractFriends()', () => {
  it('should match friends together', () => {
    const slots: QueueSlot[] = [
      { id: 0, gameClass: 'soldier', playerId: 'FAKE_SOLLY', playerReady: true },
      { id: 1, gameClass: 'medic', playerId: 'FAKE_MEDIC', playerReady: true, friend: 'FAKE_SOLLY' },
    ];

    expect(extractFriends(slots)).toEqual([['FAKE_MEDIC', 'FAKE_SOLLY']]);
  });

  it('should only consider medics', () => {
    const slots: QueueSlot[] = [
      { id: 0, gameClass: 'soldier', playerId: 'FAKE_SOLLY', playerReady: true },
      { id: 1, gameClass: 'demoman', playerId: 'FAKE_DEMO', playerReady: true, friend: 'FAKE_SOLLY' },
    ];

    expect(extractFriends(slots)).toEqual([]);
  });

  it('should get rid of friends that are not among the slots', () => {
    const slots: QueueSlot[] = [
      { id: 0, gameClass: 'soldier', playerId: 'FAKE_SOLLY_1', playerReady: true },
      { id: 1, gameClass: 'medic', playerId: 'FAKE_MEDIC', playerReady: true, friend: 'FAKE_SOLLY_2' },
    ];

    expect(extractFriends(slots)).toEqual([]);
  });

  it('should not pair up two medics', () => {
    const slots: QueueSlot[] = [
      { id: 0, gameClass: 'medic', playerId: 'FAKE_MEDIC_1', playerReady: true, friend: 'FAKE_MEDIC_2' },
      { id: 1, gameClass: 'medic', playerId: 'FAKE_MEDIC_2', playerReady: true, friend: 'FAKE_MEDIC_1' },
    ];

    expect(extractFriends(slots)).toEqual([]);
  });
});
