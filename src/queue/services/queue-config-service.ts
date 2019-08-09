import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { Config } from '../../config';
import { QueueConfig } from '../models/queue-config';
import { queueConfigs } from '../queue-configs';

@provide(QueueConfigService)
export class QueueConfigService {

  public readonly queueConfig: QueueConfig;

  constructor(
    @inject('config') config: Config,
  ) {
    this.queueConfig = queueConfigs[config.queueConfig];
  }

}
