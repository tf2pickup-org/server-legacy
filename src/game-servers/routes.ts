import { Router } from 'express';
import { Document, Types } from 'mongoose';
import { ensureAuthenticated, ensureRole } from '../auth';
import { container } from '../container';
import logger from '../logger';
import { IPlayer } from '../players/models/player';
import { renameId } from '../utils';
import { GameServerController } from './game-server-controller';
import { GameServer, IGameServer } from './models/game-server';

function removeRcon(user: IPlayer): (doc: Document, ret: any) => any {
  return (doc: Document, ret: any) => {
    ret = renameId(doc, ret);

    if (!user || !user.role) {
      delete ret.rconPassword;
    }

    return ret;
  };
}

const router = Router();

router
  .route('/')
  .get(async (req, res) => {
    const servers = await GameServer.find();
    return res.status(200).send(servers.map(s => s.toJSON({ transform: removeRcon(req.user) })));
  })
  .post(ensureAuthenticated, ensureRole('super-user'), async (req, res) => {
    const gameServer = req.body as IGameServer;
    if (!gameServer) {
      return res.status(400).send({ message: 'invalid game server' });
    }

    try {
      const gameServerController = container.get(GameServerController);
      const ret = await gameServerController.addGameServer(gameServer);
      return res.status(201).send(ret.toJSON());
    } catch (error) {
      logger.error(error.message);
      return res.status(400).send({ message: error.message });
    }
  });

router
  .route('/:id')
  .get(async (req, res) => {
    const id = req.params.id;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'invalid id' });
    }

    const server = await GameServer.findById(id);
    if (server) {
      return res.status(200).send(server.toJSON({ transform: removeRcon(req.user) }));
    } else {
      return res.status(404).send({ message: 'no such game server' });
    }
  })
  .delete(ensureAuthenticated, ensureRole('super-user'), async (req, res) => {
    const id = req.params.id;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'invalid id' });
    }

    const { ok } = await GameServer.deleteOne({ _id: id });
    logger.debug('game server removed');
    if (ok) {
      return res.status(204).send();
    } else {
      return res.status(500).send({ message: 'unabled to remove server' });
    }
  });

export default router;
