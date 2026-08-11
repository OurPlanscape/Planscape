import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FeatureFlagDirective } from './feature-flag.directive';
import { FeatureService } from './feature.service';
import { FEATURES_JSON } from './features-config';
import { parseFeatureFlags } from './features';
import { environment } from '@env/environment';

@NgModule({
  declarations: [FeatureFlagDirective],
  imports: [CommonModule],
  providers: [
    FeatureService,
    {
      provide: FEATURES_JSON,
      useFactory: () =>
        parseFeatureFlags(
          environment.feature_flags || import.meta?.env?.['FEATURE_FLAGS']
        ),
    },
  ],
  exports: [FeatureFlagDirective],
})
export class FeaturesModule {}
