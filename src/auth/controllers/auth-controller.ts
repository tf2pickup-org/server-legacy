import { Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, queryParam, request, response } from 'inversify-express-utils';
import passport from 'passport';
import { Config, config } from '../../config';
import { ensureAuthenticated } from '../ensure-authenticated';
import { TokenService } from '../services';

@controller('/auth')
export class AuthController {

  constructor(
    // tslint:disable-next-line: no-shadowed-variable
    @inject('config') private config: Config,
    @inject(TokenService) private tokenService: TokenService,
  ) { }

  @httpGet('/steam', passport.authenticate('steam', { session: false }))
  // tslint:disable-next-line: no-empty
  public authSteam() { }

  @httpGet('/steam/return', passport.authenticate('steam', {
    session: false,
  }))
  public authSteamCallback(req: Request, res: Response) {
    // todo
    // Handle login error. Right now user is redirected to an empty page displaying only the error message.
    // This should be handled in a better way.
    const user = req.user;
    const refreshToken = this.tokenService.generateToken('refresh', user.id);
    const authToken = this.tokenService.generateToken('auth', user.id);
    return res.redirect(`${this.config.clientUrl}?refresh_token=${refreshToken}&auth_token=${authToken}`);
  }

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
    const wsToken = this.tokenService.generateToken('ws', req.user.id);
    return res.status(200).send({ wsToken });
  }

}
