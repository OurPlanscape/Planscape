import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExploreMapComponent } from './explore-map.component';
import { MockProvider, MockProviders } from 'ng-mocks';
import { MultiMapConfigState } from '../multi-map-config.state';
import { MapConfigState, MapInteractionMode } from '../map-config.state';
import { AuthService, DataLayersService } from '@services';
import { DrawService } from '../draw.service';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { PlanState } from '@plan/plan.state';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { MapModuleService } from '@services/map-module.service';
import { FeaturesModule } from '@features/features.module';
import { MOCK_GEOMETRY, MOCK_PLAN } from '@services/mocks';

describe('ExploreMapComponent', () => {
  let component: ExploreMapComponent;
  let fixture: ComponentFixture<ExploreMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExploreMapComponent, FeaturesModule],
      providers: [
        MockProvider(DataLayersService),
        MockProviders(MultiMapConfigState, AuthService, DrawService),
        // alias the abstract token
        { provide: MapConfigState, useExisting: MultiMapConfigState },
        MockProvider(MultiMapConfigState, {
          selectedMapId$: new BehaviorSubject(3),
        }),
        MockProvider(MapConfigState, {
          mapInteractionMode$: new BehaviorSubject<MapInteractionMode>('view'),
          baseMapUrl$: of(''),
        }),
        MockProvider(PlanState, {
          currentPlanId$: of(null),
        }),
        MockProvider(DataLayersStateService),
        MockProvider(MapModuleService, {
          datasets$: of({
            main_datasets: [],
            base_datasets: [],
          }),
        }),
        MockProvider(PlanState, {
          currentPlan$: of(MOCK_PLAN),
          currentPlanId$: of(123),
          planningAreaGeometry$: of(MOCK_GEOMETRY),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExploreMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have isSelected$ as TRUE if map is selected', async () => {
    component.mapNumber = 3;
    fixture.detectChanges();
    const isSelected = await firstValueFrom(component.isSelected$);
    expect(isSelected).toBeTrue();
  });

  it('should have isSelected$ as FALSE if map is NOT selected', async () => {
    component.mapNumber = 1;
    fixture.detectChanges();
    const isSelected = await firstValueFrom(component.isSelected$);
    expect(isSelected).toBeFalse();
  });
});
