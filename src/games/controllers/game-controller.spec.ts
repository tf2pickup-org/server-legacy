import { results } from 'inversify-express-utils';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Types } from 'mongoose';
import { gameModel } from '../../games/models/game';
import { GameService } from '../../games/services/game-service';
import { GameController } from './game-controller';

class GameServiceStub {

}

describe('GameController', () => {
  const gameService = new GameServiceStub() as GameService;
  let mongod: MongoMemoryServer;
  let controller: GameController;

  beforeAll(async () => {
    mongod = new MongoMemoryServer();
    const uri = await mongod.getConnectionString();
    await connect(uri, { useNewUrlParser: true });
  });

  afterAll(async () => await mongod.stop());

  beforeEach(() => {
    controller = new GameController(gameService);
  });

  describe('#getGames()', () => {
    beforeAll(async () => {
      await gameModel.create([
        {
          number: 1,
          slots: [],
        },
        {
          number: 2,
          slots: [],
        },
        {
          number: 3,
          slots: [],
        },
      ]);
    });

    afterAll(async () => await gameModel.deleteMany({}));

    it('should return 200', async () => {
      const response = await controller.getGames();
      expect(response instanceof results.JsonResult).toBe(true);
      expect(response.statusCode).toBe(200);
    });

    it('should return correct item count', async () => {
      const response = await controller.getGames();
      expect(response.json.itemCount).toBe(3);
      expect(response.json.results.length).toBe(3);
    });

    describe('with pagination', () => {
      it('should return correct item count', async () => {
        const response = await controller.getGames('2');
        expect(response.json.itemCount).toBe(3);
        expect(response.json.results.length).toBe(2);

        const response2 = await controller.getGames('2', '2');
        expect(response2.json.itemCount).toBe(3);
        expect(response2.json.results.length).toBe(1);

        const response3 = await controller.getGames('2', '3');
        expect(response3.json.itemCount).toBe(3);
        expect(response3.json.results.length).toBe(0);
      });
    });

    it('should return 400 if limit is not a number', async () => {
      const response = await controller.getGames('asdf');
      expect(response.statusCode).toBe(400);
      expect(response.json).toEqual({ message: 'limit is not a number' });
    });

    it('should return 400 if offset is not a number', async () => {
      const response = await controller.getGames(undefined, 'asdf');
      expect(response.statusCode).toBe(400);
      expect(response.json).toEqual({ message: 'offset is not a number' });
    });

    it('should return 400 if sort param is wrong', async () => {
      const response = await controller.getGames(undefined, undefined, 'asdf');
      expect(response.statusCode).toBe(400);
      expect(response.json).toEqual({ message: 'invalid value for the sort parameter' });
    });
  });

  describe('#getGame()', () => {
    let gameId: string;

    beforeAll(async () => {
      const game = await gameModel.create(
        {
          number: 1,
          slots: [],
        },
      );

      gameId = game._id;
    });

    afterAll(async () => await gameModel.deleteMany({}));

    it('should return 200', async () => {
      const response = await controller.getGame(gameId);
      expect(response.statusCode).toBe(200);
      expect(response.json.number).toBe(1);
    });

    it('should return 404 for non-existent game', async () => {
      const id = Types.ObjectId();
      const response = await controller.getGame(`${id}`);
      expect(response.statusCode).toBe(404);
      expect(response.json).toEqual({ message: 'no such game' });
    });

    it('should return 400 for user\'s errors', async () => {
      const response = await controller.getGame('FAKE_ID');
      expect(response.statusCode).toBe(400);
      expect(response.json).toEqual({ message: 'invalid id' });
    });
  });
});
