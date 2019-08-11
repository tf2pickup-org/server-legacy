import { connect } from 'mongoose';
import { config } from '../src/config';
import { playerModel } from '../src/players/models/player';
import { playerSkillModel } from '../src/players/models/player-skill';

(async () => {
  await connect(`mongodb://${config.mongodb.username}:${config.mongodb.password}@` +
    `${config.mongodb.host}:${config.mongodb.port}/${config.mongodb.db}`,
    { useNewUrlParser: true },
  );

  const all = { };
  const players = await playerModel.find();
  await Promise.all(players.map(async player => {
    const skill = await playerSkillModel.findOne({ player }).lean();
    all[player.name] = skill.skill;
  }));

  console.log(JSON.stringify(all, null, 2));
  process.exit(0);
})();
