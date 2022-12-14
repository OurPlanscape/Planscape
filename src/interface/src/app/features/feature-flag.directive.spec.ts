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
});

@Component({
  template: ` <h2 *featureFlag="'false'">False</h2>
    <h2 *featureFlag="'undefined'">Undefined</h2>
    <h2 *featureFlag="'true'">True</h2>`,
})
class TestComponent {}
