import { TestBed } from '@angular/core/testing';
import { FeatureService } from './feature.service';

/**
 * Turns the given feature flags on for a test, leaving every other flag off.
 * Call it after `configureTestingModule` and before creating the component.
 *
 * Uses `overrideProvider` rather than a plain provider: a standalone component
 * that imports `FeaturesModule` gets that module's providers in its own
 * injector, which shadows anything the spec declares.
 */
export function overrideFeatureFlags(...flags: string[]) {
  TestBed.overrideProvider(FeatureService, {
    useValue: {
      isFeatureEnabled: (featureName: string) => flags.includes(featureName),
    } as FeatureService,
  });
}
