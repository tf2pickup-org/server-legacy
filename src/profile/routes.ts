import { Router } from 'express';
import { ensureAuthenticated } from '../auth';

const router = Router();

router
  .route('/')
  .get(ensureAuthenticated, (req, res) => res.status(200).send(req.user));

export default router;
