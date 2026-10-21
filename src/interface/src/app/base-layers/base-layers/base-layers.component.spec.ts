import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FEATURES_JSON } from '@features/features-config';
import { FeaturesModule } from '@features/features.module';
import { MapModuleService } from '@services/map-module.service';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject } from 'rxjs';
import { ButtonComponent } from '@styleguide';
import { MessageCardComponent } from '@styleguide/message-card/message-card.component';
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
  let loadError$: BehaviorSubject<boolean>;

  function setup(dataOrganization: boolean) {
    loadError$ = new BehaviorSubject(false);
    TestBed.configureTestingModule({
      imports: [BaseLayersComponent],
      providers: [MockProvider(MapModuleService, { loadError$ })],
    })
      .overrideComponent(BaseLayersComponent, {
        set: {
          imports: [
            AsyncPipe,
            ButtonComponent,
            MessageCardComponent,
            NgIf,
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

  describe('when the map module fails to load', () => {
    it('replaces the panel with an error', () => {
      const fixture = setup(true);
      loadError$.next(true);
      fixture.detectChanges();

      expect(
        fixture.debugElement.query(By.css('app-base-layers-panel'))
      ).toBeNull();
      expect(
        fixture.debugElement.query(By.css('sg-message-card')).nativeElement
          .textContent
      ).toContain("We couldn't load base layers");
    });

    it('retries the load', () => {
      const fixture = setup(false);
      loadError$.next(true);
      fixture.detectChanges();

      const mapModuleService = TestBed.inject(MapModuleService);
      spyOn(mapModuleService, 'retryLoadMapModule');

      fixture.nativeElement.querySelector('sg-message-card button').click();

      expect(mapModuleService.retryLoadMapModule).toHaveBeenCalled();
    });
  });
});
