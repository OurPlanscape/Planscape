import { Injectable } from '@angular/core';
import { FeaturesConfig } from './features-config';

import config from './features.json';

@Injectable({
  providedIn: 'root',
})
export class FeatureService {
  private config: FeaturesConfig;

  constructor() {
    this.config = config;
  }

  /** If feature flag exists, return its value. */
  isFeatureEnabled(featureName: string): boolean | undefined {
    return this.config[featureName];
  }
}
