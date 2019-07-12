import { Queue } from './models/queue';

export const queue: Queue = {
  config: {
    classes: [
      { name: 'scout', count: 2 },
      { name: 'soldier', count: 2 },
      { name: 'demoman', count: 1 },
      { name: 'medic', count: 1 },
    ],
  },
  players: [ ],
};
