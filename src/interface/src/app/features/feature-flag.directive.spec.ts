import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FeatureFlagDirective } from './feature-flag.directive';
import { FeaturesModule } from './features.module';
import { FEATURES_JSON } from './features-config';

describe('FeatureFlagDirective', () => {
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(() => {
    fixture = TestBed.configureTestingModule({
      declarations: [FeatureFlagDirective, TestComponent],
      providers: [{ provide: FEATURES_JSON, useValue: { valid: true } }],
      imports: [FeaturesModule],
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
  template: `
    <h2 *featureFlag="'not_valid'">False</h2>
    <h2 *featureFlag="'undefined'">Undefined</h2>
    <h2 *featureFlag="''">Nothing</h2>
    <h2 *featureFlag="'valid'">True</h2>
    <h3 *featureFlag="'valid'; hide: true">Hidden</h3>
    <h4 *featureFlag="'valid'; hide: false">Visible</h4>
  `,
})
class TestComponent {}
