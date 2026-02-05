import {
  Directive,
  Input,
  OnInit,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

import { FeatureService } from './feature.service';

/** Directive to show or hide a DOM element based on whether a feature flag is enabled. */
@Directive({
  selector: '[appFeatureFlag]',
})
export class FeatureFlagDirective implements OnInit {
  @Input() appFeatureFlag!: string;
  // if provided as true, will hide the content when the flag is true
  @Input() appFeatureFlagHide = false;

  constructor(
    private featureService: FeatureService,
    private templateRef: TemplateRef<any>,
    private viewContainerRef: ViewContainerRef
  ) {}

  ngOnInit() {
    const isEnabled = this.featureService.isFeatureEnabled(this.appFeatureFlag);
    const shouldShow = this.appFeatureFlagHide ? !isEnabled : isEnabled;
    if (shouldShow) {
      this.viewContainerRef.createEmbeddedView(this.templateRef);
    }
  }
}
