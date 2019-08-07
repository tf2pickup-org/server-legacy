import { Container } from 'inversify';
import getDecorators from 'inversify-inject-decorators';
import { config } from './config';

const container = new Container({ defaultScope: 'Singleton' });
container.bind('config').toConstantValue(config);

const { lazyInject } = getDecorators(container);

export { container, lazyInject };
