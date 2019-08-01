import { fluentProvide } from 'inversify-binding-decorators';

export const provideSingleton = identifier => fluentProvide(identifier).inSingletonScope().done();
