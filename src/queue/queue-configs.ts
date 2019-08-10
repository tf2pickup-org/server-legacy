import { QueueConfig } from './models/queue-config';

export const queueConfigs: { [name: string]: QueueConfig } = {
  'test': {
    teamCount: 2,
    classes: [
      { name: 'soldier', count: 1 },
    ],
    readyUpTimeout: 10 * 1000, // 10 seconds
    maps: [ 'cp_process_final', 'cp_badlands', 'cp_sunshine' ],
    execConfigs: [],
    nextMapSuccessfulVoteThreshold: 2,
  },
  '6v6': {
    teamCount: 2,
    classes: [
      { name: 'scout', count: 2 },
      { name: 'soldier', count: 2 },
      { name: 'demoman', count: 1 },
      { name: 'medic', count: 1 },
    ],
    readyUpTimeout: 60 * 1000, // 1 minute
    maps: [
      'cp_process_final',
      'cp_snakewater_final1',
      'cp_sunshine',
      'cp_granary_pro_rc8',
      'cp_gullywash_final1',
      'cp_metalworks',
      'cp_prolands_rc2t',
    ],
    execConfigs: ['etf2l_6v6_5cp'],
    nextMapSuccessfulVoteThreshold: 7,
  },
  'bball': {
    teamCount: 2,
    classes: [
      { name: 'soldier', count: 2 },
    ],
    readyUpTimeout: 60 * 1000,
    maps: [
      'ctf_ballin_sky',
    ],
    execConfigs: ['etf2l_bball', 'instant_spawns'],
    nextMapSuccessfulVoteThreshold: 4,
  },
};
