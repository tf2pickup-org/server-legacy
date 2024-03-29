import logger from '../../logger';
import { GamePlayer } from '../models';

export interface PlayerSlot {
  playerId: string;
  gameClass: string;
  skill: number; // the skill for the given gameClass
}

export interface TeamOverrides {
  friends: string[][];
}

interface InterimTeamSetup {
  [teamId: number]: PlayerSlot[];
  skillDifference: number;
}

function filterTeamOverrides(teamSetups: InterimTeamSetup[], overrides: TeamOverrides): InterimTeamSetup[] {
  return teamSetups.filter(setup => {
    let hasAllFriends = false;
    overrides.friends.forEach(friends => {
      if (friends.every(f => !!setup[0].find(s => s.playerId === f))) {
        hasAllFriends = true;
      }
    });

    return hasAllFriends;
  });
}

/**
 * From the given pool of players make two teams that make the smallest average skill difference.
 */
export function pickTeams(players: PlayerSlot[], gameClasses: string[], overrides?: TeamOverrides): GamePlayer[] {
  const allPossibilities: Array<{
    gameClass: string,
    allClassCombinations: Array<{ [teamId: number]: PlayerSlot[] }>,
  }> = [];

  for (const gameClass of gameClasses) {
    const ofGameClass = players.filter(p => p.gameClass === gameClass);
    const allClassCombinations: Array<{ [teamId: number]: PlayerSlot[] }> = [];

    if (ofGameClass.length === 2) {
      allClassCombinations.push({
        0: [ ofGameClass[0] ],
        1: [ ofGameClass[1] ],
      });

      allClassCombinations.push({
        0: [ ofGameClass[1] ],
        1: [ ofGameClass[0] ],
      });
    } else {
      for (let i = 0; i < ofGameClass.length - 1; ++i) {
        for (let j = i + 1; j < ofGameClass.length; ++j) {
          const a = [];
          const b = [];
          for (let k = 0; k < ofGameClass.length; ++k) {
            if (k === i || k === j) {
              a.push(ofGameClass[k]);
            } else {
              b.push(ofGameClass[k]);
            }
          }

          allClassCombinations.push({
            0: a,
            1: b,
          });
        }
      }
    }

    allPossibilities.push({ gameClass, allClassCombinations });
  }

  const tmp = [];

  function makeAllCombinations(prev: any[]) {
    if (prev.length === gameClasses.length) {
      tmp.push(prev);
    } else {
      const gameClass = gameClasses[prev.length];
      const allClassCombinations = allPossibilities
        .filter(p => p.gameClass === gameClass)
        .map(p => p.allClassCombinations)
        [0];
      for (const c of allClassCombinations) {
        makeAllCombinations([...prev, c]);
      }
    }
  }

  makeAllCombinations([]);

  let allCombinations: InterimTeamSetup[] = tmp.map(c => c.reduce((prev, curr) => {
    prev[0] = prev[0].concat(curr[0]);
    prev[1] = prev[1].concat(curr[1]);
    return prev;
  }, { 0: [], 1: [] }));

  allCombinations.forEach(c => {
    const skillRed = c[0].reduce((prev, curr) => prev + curr.skill, 0) / c[0].length;
    const skillBlu = c[1].reduce((prev, curr) => prev + curr.skill, 0) / c[1].length;
    c.skillDifference = Math.abs(skillRed - skillBlu);
  });

  logger.debug(`${allCombinations.length} possible team setups`);

  if (overrides) {
    const tmpCombinations = filterTeamOverrides(allCombinations, overrides);
    logger.debug(`${tmpCombinations.length} possible team setups after filtering out overrides`);
    if (tmpCombinations.length > 0) {
      allCombinations = tmpCombinations;
    }
  }

  allCombinations.sort((a, b) => a.skillDifference - b.skillDifference);
  const lowestSkillDifference = allCombinations[0].skillDifference;
  const possibleTeams = allCombinations.filter(c => c.skillDifference === lowestSkillDifference);
  logger.debug(`there are ${possibleTeams.length} possible teams with lowest skill difference`);

  const selected = possibleTeams[Math.floor(Math.random() * possibleTeams.length)];
  logger.debug(`team average skill difference = ${selected.skillDifference}`);

  return Object.keys(selected)
    .map(key => {
      if (selected[key].length) {
        return selected[key].map(p => ({...p, teamId: key}));
      }
    })
    .filter(e => !!e)
    .flatMap(p => p)
    .map(p => {
      const { skill, ...player } = p;
      return { ...player, status: 'active' };
    });
}
