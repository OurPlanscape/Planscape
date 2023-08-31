import { InjectionToken } from '@angular/core';

export interface FeaturesConfig {
  [key: string]: boolean;
}

export const FEATURES_JSON = new InjectionToken<string>('features_json');
