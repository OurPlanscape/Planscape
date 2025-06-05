import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FeatureFlagDirective } from './feature-flag.directive';
import { FeatureService } from './feature.service';
import config from './features.generated.json';
import { FEATURES_JSON } from './features-config';

@NgModule({
  declarations: [FeatureFlagDirective],
  imports: [CommonModule],
  providers: [FeatureService, { provide: FEATURES_JSON, useValue: config }],
  exports: [FeatureFlagDirective],
})
export class FeaturesModule {}
