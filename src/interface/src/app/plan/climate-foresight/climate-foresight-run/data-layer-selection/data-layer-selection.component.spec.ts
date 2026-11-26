import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AsyncPipe } from '@angular/common';
import { MockComponent, MockProvider } from 'ng-mocks';
import { BehaviorSubject, map, of } from 'rxjs';

import { SectionComponent } from '@styleguide';
import { ChipSelectorComponent } from '@styleguide/chip-selector/chip-selector.component';
import { overrideFeatureFlags } from '@features/testing';
import { FeaturesModule } from '@features/features.module';
import { DataLayersRailComponent } from '@data-layers/data-layers-rail/data-layers-rail.component';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { ClimateForesightService } from '@services';
import { ClimateForesightMapComponent } from '@plan/climate-foresight/climate-foresight-run/climate-foresight-map/climate-foresight-map.component';
import { LegacyDataLayerSelectionComponent } from '@plan/climate-foresight/climate-foresight-run/legacy-data-layer-selection/legacy-data-layer-selection.component';
import { MAX_CLIMATE_DATALAYERS } from '@shared';
import { DataLayer } from '@types';
import { DataLayerSelectionComponent } from './data-layer-selection.component';

function layer(id: number): DataLayer {
  return { id, name: `Layer ${id}` } as DataLayer;
}

describe('DataLayerSelectionComponent', () => {
  let fixture: ComponentFixture<DataLayerSelectionComponent>;
  let selected$: BehaviorSubject<DataLayer[]>;

  function setup(dataOrganization = true) {
    selected$ = new BehaviorSubject<DataLayer[]>([]);

    TestBed.configureTestingModule({
      imports: [DataLayerSelectionComponent, NoopAnimationsModule],
      providers: [
        MockProvider(ClimateForesightService, {
          getDataLayers: () => of([]),
        }),
        MockProvider(DataLayersStateService, {
          selectedDataLayers$: selected$,
          selectedLayersCount$: selected$.pipe(map((l) => l.length)),
          removeSelectedLayer: (toRemove: DataLayer) =>
            selected$.next(selected$.value.filter((l) => l.id !== toRemove.id)),
        }),
      ],
    }).overrideComponent(DataLayerSelectionComponent, {
      set: {
        imports: [
          AsyncPipe,
          ChipSelectorComponent,
          FeaturesModule,
          SectionComponent,
          MockComponent(DataLayersRailComponent),
          MockComponent(LegacyDataLayerSelectionComponent),
          MockComponent(ClimateForesightMapComponent),
        ],
      },
    });

    if (dataOrganization) {
      overrideFeatureFlags('DATA_ORGANIZATION');
    } else {
      overrideFeatureFlags();
    }

    fixture = TestBed.createComponent(DataLayerSelectionComponent);
    fixture.detectChanges();
  }

  function selectedIds() {
    return selected$.value.map((l) => l.id);
  }

  it('browses layers through the rail when DATA_ORGANIZATION is on', () => {
    setup(true);

    expect(
      fixture.debugElement.query(By.css('app-data-layers-rail'))
    ).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('app-legacy-data-layer-selection'))
    ).toBeNull();
  });

  it('keeps the slide-over browser when DATA_ORGANIZATION is off', () => {
    setup(false);

    expect(
      fixture.debugElement.query(By.css('app-legacy-data-layer-selection'))
    ).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('app-data-layers-rail'))
    ).toBeNull();
  });

  it('counts the selection against the maximum', () => {
    setup();
    selected$.next([layer(1), layer(2), layer(3)]);
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('.headline-hint')).nativeElement
        .textContent
    ).toContain(`3/${MAX_CLIMATE_DATALAYERS} Selected`);
  });

  it('drops a layer when its chip is removed', () => {
    setup();
    selected$.next([layer(1), layer(2)]);
    fixture.detectChanges();

    fixture.debugElement
      .queryAll(By.css('sg-chip-selector button.chip-button'))[0]
      .nativeElement.click();
    fixture.detectChanges();

    expect(selectedIds()).toEqual([2]);
  });
});
