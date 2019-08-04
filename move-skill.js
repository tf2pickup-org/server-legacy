const Schema = require('mongoose').Schema,
  model = require('mongoose').model,
  connect = require('mongoose').connect,
  mongodbConfig = require('./config.json').mongodb;

const playerSchema = new Schema({
  steamId: { type: Schema.Types.String, required: true },
  name: { type: Schema.Types.String, unique: true, trim: true, required: true },
  joinedAt: Schema.Types.Date,
  avatarUrl: { type: Schema.Types.String },
  role: Schema.Types.String,
  hasAcceptedRules: Schema.Types.Boolean,
  etf2lProfileId: Schema.Types.Number,
  skill: { type: Map, of: String },
});

const Player = model('Player', playerSchema);

const playerSkillSchema = new Schema({
  skill: { type: Map, of: String },
  player: { type: Schema.Types.ObjectId, ref: 'Player' },
});

const PlayerSkill = model('PlayerSkill', playerSkillSchema);

async function main() {
  await connect(`mongodb://${mongodbConfig.username}:${mongodbConfig.password}@` +
      `${mongodbConfig.host}:${mongodbConfig.port}/${mongodbConfig.db}`,
      { useNewUrlParser: true },
    );

  for await (const player of Player.find()) {
    if (player.skill) {
      const skill = player.skill;
      await new PlayerSkill({ player, skill }).save();
      player.skill = undefined;
      await player.save();

      console.log(`player skill of ${player.name} moved`);
    }
  }
}

main();
