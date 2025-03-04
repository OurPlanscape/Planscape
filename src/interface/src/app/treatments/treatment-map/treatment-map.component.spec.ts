import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreatmentMapComponent } from './treatment-map.component';
import { MockDeclarations, MockProvider, MockProviders } from 'ng-mocks';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { TreatedStandsState } from './treated-stands.state';
import { MapStandsComponent } from '../map-stands/map-stands.component';
import { MapRectangleComponent } from '../map-rectangle/map-rectangle.component';
import { MapProjectAreasComponent } from '../map-project-areas/map-project-areas.component';
import { SelectedStandsState } from './selected-stands.state';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';
import { Geometry } from 'geojson';

import { AuthService, PlanService } from '@services';

import { TreatmentsState } from '../treatments.state';
import { DEFAULT_BASE_MAP } from './map-base-layers';

describe('TreatmentMapComponent', () => {
  let component: TreatmentMapComponent;
  let fixture: ComponentFixture<TreatmentMapComponent>;

  beforeEach(async () => {
    const mockGeometry: Geometry = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [10, 20],
            [10, 30],
            [15, 15],
          ],
        ],
      ],
    };

    await TestBed.configureTestingModule({
      imports: [TreatmentMapComponent, CommonModule],
      providers: [
        MockProviders(
          TreatedStandsState,
          SelectedStandsState,
          AuthService,
          TreatmentsState,
          PlanService
        ),
        MockProvider(MapConfigState, {
          cursor$: of(''),
          baseLayer$: of(DEFAULT_BASE_MAP),
        }),
        {
          provide: TreatmentsState,
          useValue: {
            planId$: of(null),
            planningArea$: of({ geometry: mockGeometry }),
          },
        },
      ],
      declarations: [
        MockDeclarations(
          MapStandsComponent,
          MapRectangleComponent,
          MapProjectAreasComponent
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
