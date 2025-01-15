import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { TreatmentProjectAreaComponent } from './treatment-project-area.component';
import { RouterTestingModule } from '@angular/router/testing';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { MapConfigState } from '../treatment-map/map-config.state';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatmentsState } from '../treatments.state';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { of } from 'rxjs';
import { Geometry } from 'geojson';

describe('TreatmentProjectAreaComponent', () => {
  let component: TreatmentProjectAreaComponent;
  let fixture: ComponentFixture<TreatmentProjectAreaComponent>;

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
      imports: [
        TreatmentProjectAreaComponent,
        RouterTestingModule,
        HttpClientTestingModule,
        BrowserAnimationsModule,
      ],
      providers: [
        MockProviders(MapConfigState, SelectedStandsState, TreatmentsState),
        {
          provide: TreatmentsState,
          useValue: {
            setShowApplyTreatmentsDialog: jasmine.createSpy(
              'setShowApplyTreatmentsDialog'
            ),
            planningArea$: of({ geometry: mockGeometry }),
            activeProjectArea$: of({
              geometry: mockGeometry,
              prescriptions: [],
            }),
          },
        },
      ],
      declarations: [
        MockDeclarations(TreatmentMapComponent, MapBaseLayerComponent),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentProjectAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
