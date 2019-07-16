import { Router } from 'express';
import { Document } from 'mongoose';
import { ensureAuthenticated, ensureRole } from '../auth';
import { renameId } from '../utils';
import { gameServerController } from './game-server-controller';
import { GameServer, IGameServer } from './models/game-server';

const router = Router();

router
  .route('/')
  .get(async (req, res) => {
    const servers = await GameServer.find();
    return res.status(200).send(servers.map(s => s.toJSON({ transform: (doc: Document, ret: any) => {
      ret = renameId(doc, ret);

      if (!req.user || !req.user.role) {
        delete ret.rconPassword;
      }

      return ret;
    }})));
  })
  .post(ensureAuthenticated, ensureRole('super-user'), async (req, res) => {
    const gameServer = req.body as IGameServer;
    if (!gameServer) {
      return res.status(400).send({ message: 'invalid game server' });
    }

    try {
      const ret = await gameServerController.addGameServer(gameServer);
      return res.status(201).send(ret.toJSON());
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  });

export default router;
