import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FeatureFlagDirective } from '@app/features/feature-flag.directive';
import { FeatureService } from '@app/features/feature.service';
import { FEATURES_JSON } from '@app/features/features-config';
import { parseFeatureFlags } from '@app/features/features';

@NgModule({
  declarations: [FeatureFlagDirective],
  imports: [CommonModule],
  providers: [
    FeatureService,
    {
      provide: FEATURES_JSON,
      useFactory: () => parseFeatureFlags(import.meta?.env?.['FEATURE_FLAGS']),
    },
  ],
  exports: [FeatureFlagDirective],
})
export class FeaturesModule {}
