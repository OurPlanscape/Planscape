import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { FeatureFlagDirective } from './feature-flag.directive';
import { FeatureService } from './feature.service';

@NgModule({
  declarations: [FeatureFlagDirective],
  imports: [CommonModule],
  providers: [FeatureService],
  exports: [FeatureFlagDirective],
})
export class FeaturesModule {}
