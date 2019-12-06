import { Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, queryParam, request, response } from 'inversify-express-utils';
import passport from 'passport';
import { Config } from '../../config';
import { ExpressAppProvider } from '../../core/services';
import logger from '../../logger';
import { ensureAuthenticated } from '../ensure-authenticated';
import { TokenService } from '../services';

@controller('/auth')
export class AuthController {

  constructor(
    @inject('config') private config: Config,
    @inject(TokenService) private tokenService: TokenService,
    @inject(ExpressAppProvider) private expressAppProvider: ExpressAppProvider,
  ) {
    // this one single route is here as we need to have custom error handling
    expressAppProvider.app.get('/auth/steam/return', (req, res, next) => {
      return passport.authenticate('steam', (error, user) => {
        if (error) {
          logger.error(error);
          return res.redirect(`${this.config.clientUrl}/auth-error?error=${error}`);
        }

        if (!user) {
          return res.sendStatus(401);
        }

        const refreshToken = this.tokenService.generateToken('refresh', user.id);
        const authToken = this.tokenService.generateToken('auth', user.id);
        return res.redirect(`${this.config.clientUrl}?refresh_token=${refreshToken}&auth_token=${authToken}`);
      })(req, res, next);
    });
  }

  @httpGet('/steam', passport.authenticate('steam', { session: false }))
  // tslint:disable-next-line: no-empty
  public authSteam() { }

  @httpGet('/')
  public async authOperations(@queryParam() query: any, @response() res: Response) {
    if (query.refresh_token) {
      try {
        const oldRefreshToken = query.refresh_token;
        const { refreshToken, authToken } = await this.tokenService.refreshAuthToken(oldRefreshToken);
        return res.status(200).send({ refreshToken, authToken });
      } catch (error) {
        return res.status(400).send({ error: error.message });
      }
    } else {
      return res.status(400).send({ error: 'invalid request' });
    }
  }

  @httpGet('/wstoken', ensureAuthenticated)
  public async refreshWsToken(@request() req: Request, @response() res: Response) {
    const user = req.user as { id: string };
    const wsToken = this.tokenService.generateToken('ws', user.id);
    return res.status(200).send({ wsToken });
  }

}
