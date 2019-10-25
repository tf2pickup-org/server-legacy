import { EventEmitter } from 'events';
import { Container, decorate } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import getDecorators from 'inversify-inject-decorators';
import { config } from './config';

decorate(provide(EventEmitter), EventEmitter);

const container = new Container({ defaultScope: 'Singleton' });
container.bind('config').toConstantValue(config);

const { lazyInject } = getDecorators(container);

export { container, lazyInject };
