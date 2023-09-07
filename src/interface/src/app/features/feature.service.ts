import { Inject, Injectable } from '@angular/core';
import { FEATURES_JSON, FeaturesConfig } from './features-config';

@Injectable({
  providedIn: 'root',
})
export class FeatureService {
  constructor(@Inject(FEATURES_JSON) private readonly config: FeaturesConfig) {
    this.config = config;
  }

  isFeatureEnabled(featureName: string): boolean {
    return !!this.config[featureName];
  }
}
