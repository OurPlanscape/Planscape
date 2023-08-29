import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { FeatureFlagDirective } from './feature-flag.directive';
import { FeatureService } from './feature.service';

class MockFeatureService {
  isFeatureEnabled(featureName: string): boolean | undefined {
    if (featureName === 'true') return true;
    if (featureName === 'false') return false;
    return undefined;
  }
}

describe('FeatureFlagDirective', () => {
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(() => {
    fixture = TestBed.configureTestingModule({
      declarations: [FeatureFlagDirective, TestComponent],
      providers: [
        {
          provide: FeatureService,
          useClass: MockFeatureService,
        },
      ],
    }).createComponent(TestComponent);

    fixture.detectChanges();
  });

  it('should not show element guarded by false or undefined feature flag', () => {
    const elements = fixture.debugElement.queryAll(By.css('h2'));

    expect(elements.length).toEqual(1);

    const elementHtml: string = elements[0].nativeElement.innerHTML;

    expect(elementHtml).toEqual('True');
  });

  it('should not show element guarded by true flag if `hide` is true', () => {
    const elements = fixture.debugElement.queryAll(By.css('h3'));

    expect(elements.length).toEqual(0);
  });

  it('should show element guarded by true flag if `hide` is false', () => {
    const elements = fixture.debugElement.queryAll(By.css('h4'));

    expect(elements.length).toEqual(1);
  });
});

@Component({
  template: ` <h2 *featureFlag="'false'">False</h2>
    <h2 *featureFlag="'undefined'">Undefined</h2>
    <h2 *featureFlag="'true'">True</h2>
    <h3 *featureFlag="'true'; hide: true">Hidden</h3>
    <h4 *featureFlag="'true'; hide: false">Visible</h4>`,
})
class TestComponent {}
