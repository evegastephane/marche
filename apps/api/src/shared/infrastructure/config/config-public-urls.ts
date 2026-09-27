import { Inject, Injectable } from '@nestjs/common';
import { PublicUrls } from '../../application/public-urls.port.js';
import { APP_CONFIG, type AppConfig } from './app-config.js';

@Injectable()
export class ConfigPublicUrls extends PublicUrls {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    super();
  }

  site(subdomain: string): string {
    const { urlScheme, rootDomain } = this.config.storefront;
    return `${urlScheme}://${subdomain}.${rootDomain}`;
  }

  dashboard(path: string): string {
    return `${this.config.dashboard.url}/${path.replace(/^\/+/, '')}`;
  }
}
