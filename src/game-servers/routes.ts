import { Router } from 'express';
import { GameServer } from './models/game-server';

const router = Router();

router
  .route('/')
  .get(async (req, res) => {
    const servers = await GameServer.find();
    return res.status(200).send(servers.map(s => s.toJSON()));
  });

export default router;
