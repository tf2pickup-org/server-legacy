import { Router } from 'express';
import { Types } from 'mongoose';
import { Player } from './models/player';

const router = Router();

router
  .route('/:playerId')
  .get(async (req, res) => {
    const id = req.params.playerId;
    if (Types.ObjectId.isValid(id)) {
      const player = await Player.findById(id);
      if (player) {
        return res.status(200).send(player);
      } else {
        return res.status(404).send({ message: 'no such player' });
      }
    } else {
      res.status(400).send({ message: 'invalid id' });
    }
  });

export default router;
