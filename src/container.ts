import { Container } from 'inversify';
import { config } from './config';

const container = new Container({ defaultScope: 'Singleton' });
container.bind('config').toConstantValue(config);

export { container };
