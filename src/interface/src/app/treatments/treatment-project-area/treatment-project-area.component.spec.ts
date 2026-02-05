import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { TreatmentProjectAreaComponent } from './treatment-project-area.component';
import { RouterTestingModule } from '@angular/router/testing';
import { TreatmentMapComponent } from '@treatments/treatment-map/treatment-map.component';
import { MapConfigState } from '@maplibre/map-config.state';
import { SelectedStandsState } from '@treatments/treatment-map/selected-stands.state';
import { TreatmentsState } from '../treatments.state';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { Geometry } from 'geojson';
import { AcresTreatedComponent } from '@treatments/acres-treated/acres-treated.component';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';

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
        MockProviders(
          MapConfigState,
          SelectedStandsState,
          TreatmentsState,
          DataLayersStateService
        ),
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
        {
          provide: DataLayersStateService,
          useValue: {
            paths$: of([]),
          },
        },
      ],
      declarations: [
        MockDeclarations(
          TreatmentMapComponent,
          AcresTreatedComponent,
          DataLayersComponent
        ),
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
