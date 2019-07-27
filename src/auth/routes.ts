import { Router } from 'express';
import { generateToken } from './generate-token';
import { ensureAuthenticated } from './jwt';
import { reauth } from './reauth';

const router = Router();

router.route('/')
  .get(async (req, res) => {
    if (req.query.refresh_token) {
      try {
        const oldRefreshToken = req.query.refresh_token;
        const { refreshToken, authToken } = reauth(oldRefreshToken);
        return res.status(200).send({ refreshToken, authToken });
      } catch (error) {
        return res.status(400).send({ error: error.message });
      }
    }
  });

router.route('/wstoken')
  .get(ensureAuthenticated, async (req, res) => {
    const wsToken = generateToken('ws', req.user.id);
    return res.status(200).send({ wsToken });
  });

export default router;
