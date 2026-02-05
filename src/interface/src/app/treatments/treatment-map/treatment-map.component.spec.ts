import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreatmentMapComponent } from './treatment-map.component';
import { MockDeclarations, MockProvider, MockProviders } from 'ng-mocks';
import { MapConfigState } from '@maplibre-map/map-config.state';
import { TreatedStandsState } from './treated-stands.state';
import { MapStandsComponent } from '@treatments/map-stands/map-stands.component';
import { MapRectangleComponent } from '@treatments/map-rectangle/map-rectangle.component';
import { SelectedStandsState } from './selected-stands.state';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';
import { Geometry } from 'geojson';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService, PlanService } from '@services';
import { TreatmentsState } from '../treatments.state';
import { MapProjectAreasComponent } from '@maplibre-map/map-project-areas/map-project-areas.component';
import { ActivatedRoute } from '@angular/router';
import { DEFAULT_BASE_MAP } from '@types';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';

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
      imports: [TreatmentMapComponent, CommonModule, HttpClientTestingModule],
      providers: [
        MockProviders(
          TreatedStandsState,
          SelectedStandsState,
          AuthService,
          TreatmentsState,
          PlanService,
          ActivatedRoute,
          DataLayersStateService
        ),
        MockProvider(MapConfigState, {
          cursor$: of(''),
          baseMap$: of(DEFAULT_BASE_MAP),
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
