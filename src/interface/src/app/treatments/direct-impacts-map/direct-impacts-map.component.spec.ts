import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DirectImpactsMapComponent } from '@app/treatments/direct-impacts-map/direct-impacts-map.component';
import { MockDeclarations, MockProvider, MockProviders } from 'ng-mocks';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { AuthService } from '@services';
import { DirectImpactsStateService } from '@app/treatments/direct-impacts.state.service';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TreatmentsState } from '@app/treatments/treatments.state';
import { ScenarioState } from '@app/scenario/scenario.state';
import { BehaviorSubject } from 'rxjs';

const fakeRoute = jasmine.createSpyObj(
  'ActivatedRoute',
  {},
  {
    snapshot: {
      paramMap: convertToParamMap({ id: '24' }),
    },
  }
);
describe('DirectImpactsMapComponent', () => {
  let component: DirectImpactsMapComponent;
  let fixture: ComponentFixture<DirectImpactsMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DirectImpactsMapComponent],
      providers: [
        MockProviders(
          MapConfigState,
          AuthService,
          DirectImpactsStateService,
          MapConfigState,
          TreatmentsState
        ),
        MockProvider(ScenarioState, {
          currentScenarioId$: new BehaviorSubject(1),
        }),
        { provide: ActivatedRoute, useValue: fakeRoute },
      ],
      declarations: [MockDeclarations(MapComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(DirectImpactsMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
