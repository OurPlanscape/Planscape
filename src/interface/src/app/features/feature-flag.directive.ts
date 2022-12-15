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
  selector: '[featureFlag]',
})
export class FeatureFlagDirective implements OnInit {
  @Input() featureFlag!: string;

  constructor(
    private featureService: FeatureService,
    private templateRef: TemplateRef<any>,
    private viewContainerRef: ViewContainerRef
  ) {}

  ngOnInit() {
    const isEnabled = this.featureService.isFeatureEnabled(this.featureFlag);
    if (isEnabled) {
      this.viewContainerRef.createEmbeddedView(this.templateRef);
    }
  }
}
