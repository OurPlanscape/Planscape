import { Injectable } from '@angular/core';
import { FeaturesConfig } from './features-config';

import config from './features.json';
export type FEATURE_FLAG_KEYS = keyof typeof config;

@Injectable({
  providedIn: 'root',
})
export class FeatureService {
  private readonly config: FeaturesConfig;

  constructor() {
    this.config = config;
  }

  /** If feature flag exists, return its value. */
  isFeatureEnabled(featureName: FEATURE_FLAG_KEYS): boolean | undefined {
    return this.config[featureName];
  }
}
