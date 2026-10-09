import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { DataLayerNameComponent } from './data-layer-name.component';
import { MockProvider } from 'ng-mocks';
import { DataLayersStateService } from '../data-layers.state.service';
import { of } from 'rxjs';
import { DataLayer } from '@types';
import { FeatureService } from '@features/feature.service';

const layer = { id: 1, name: 'SNV Heavy Fuels' } as DataLayer;

describe('DataLayerNameComponent', () => {
  let fixture: ComponentFixture<DataLayerNameComponent>;
  let stateService: DataLayersStateService;

  async function setup(dataOrganization: boolean) {
    await TestBed.configureTestingModule({
      imports: [DataLayerNameComponent],
      providers: [
        MockProvider(DataLayersStateService, {
          viewedDataLayer$: of(layer),
        }),
      ],
    })
      .overrideProvider(FeatureService, {
        useValue: { isFeatureEnabled: () => dataOrganization },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DataLayerNameComponent);
    stateService = TestBed.inject(DataLayersStateService);
    fixture.detectChanges();
  }

  function closeButton() {
    return fixture.debugElement.query(By.css('.close-btn'));
  }

  describe('with DATA_ORGANIZATION off', () => {
    beforeEach(() => setup(false));

    it('hides the clear button by default', () => {
      expect(closeButton()).toBeNull();
    });

    it('shows the clear button when asked to', () => {
      fixture.componentRef.setInput('showClearButton', true);
      fixture.detectChanges();
      expect(closeButton()).not.toBeNull();
    });
  });

  describe('with DATA_ORGANIZATION on', () => {
    beforeEach(() => setup(true));

    it('always shows the clear button', () => {
      expect(closeButton()).not.toBeNull();
    });

    it('clears the layer without navigating to it', () => {
      const clearSpy = spyOn(stateService, 'clearViewedDataLayer');
      const goToSpy = spyOn(stateService, 'goToSelectedLayer');

      closeButton().nativeElement.click();

      expect(clearSpy).toHaveBeenCalled();
      expect(goToSpy).not.toHaveBeenCalled();
    });
  });
});
