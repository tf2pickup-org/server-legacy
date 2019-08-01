import { Router } from 'express';
import { container } from '../container';
import { ensureAuthenticated } from './jwt';
import { TokenController } from './token-controller';

const router = Router();

router.route('/')
  .get(async (req, res) => {
    if (req.query.refresh_token) {
      try {
        const tokenController = container.get(TokenController);
        const oldRefreshToken = req.query.refresh_token;
        const { refreshToken, authToken } = await tokenController.refreshAuthToken(oldRefreshToken);
        return res.status(200).send({ refreshToken, authToken });
      } catch (error) {
        return res.status(400).send({ error: error.message });
      }
    } else {
      return res.status(400).send({ error: 'invalid request' });
    }
  });

router.route('/wstoken')
  .get(ensureAuthenticated, async (req, res) => {
    const tokenController = container.get(TokenController);
    const wsToken = tokenController.generateToken('ws', req.user.id);
    return res.status(200).send({ wsToken });
  });

export default router;
