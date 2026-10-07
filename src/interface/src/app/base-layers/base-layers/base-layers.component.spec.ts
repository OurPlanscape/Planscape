import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FEATURES_JSON } from '@features/features-config';
import { FeaturesModule } from '@features/features.module';
import { BaseLayersComponent } from './base-layers.component';

@Component({
  selector: 'app-base-layers-panel',
  standalone: true,
  template: '',
})
class BaseLayersPanelStubComponent {}

@Component({
  selector: 'app-legacy-base-layers',
  standalone: true,
  template: '',
})
class LegacyBaseLayersStubComponent {}

describe('BaseLayersComponent', () => {
  function setup(dataOrganization: boolean) {
    TestBed.configureTestingModule({ imports: [BaseLayersComponent] })
      .overrideComponent(BaseLayersComponent, {
        set: {
          imports: [
            FeaturesModule,
            BaseLayersPanelStubComponent,
            LegacyBaseLayersStubComponent,
          ],
        },
      })
      .overrideProvider(FEATURES_JSON, {
        useValue: { DATA_ORGANIZATION: dataOrganization },
      });
    const fixture = TestBed.createComponent(BaseLayersComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the new panel when DATA_ORGANIZATION is on', () => {
    const fixture = setup(true);

    expect(
      fixture.debugElement.query(By.css('app-base-layers-panel'))
    ).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('app-legacy-base-layers'))
    ).toBeNull();
  });

  it('shows the legacy panel when DATA_ORGANIZATION is off', () => {
    const fixture = setup(false);

    expect(
      fixture.debugElement.query(By.css('app-legacy-base-layers'))
    ).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('app-base-layers-panel'))
    ).toBeNull();
  });
});
