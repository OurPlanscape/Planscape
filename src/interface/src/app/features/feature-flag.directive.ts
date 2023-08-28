import {
  Directive,
  Input,
  OnInit,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

import {FEATURE_FLAG_KEYS, FeatureService} from './feature.service';

/** Directive to show or hide a DOM element based on whether a feature flag is enabled. */
@Directive({
  selector: '[featureFlag]',
})
export class FeatureFlagDirective implements OnInit {
  @Input() featureFlag!: FEATURE_FLAG_KEYS;
  // if provided as true, will hide the content when the flag is true
  @Input() featureFlagHide= false;

  constructor(
    private featureService: FeatureService,
    private templateRef: TemplateRef<any>,
    private viewContainerRef: ViewContainerRef
  ) {}

  ngOnInit() {
    const isEnabled = this.featureService.isFeatureEnabled(this.featureFlag);
    const shouldShow = this.featureFlagHide ? !isEnabled : isEnabled;
    if (shouldShow) {
      this.viewContainerRef.createEmbeddedView(this.templateRef);
    }
  }
}
