import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioMapComponent } from './scenario-map.component';
import { MockProvider, MockProviders } from 'ng-mocks';
import { MapConfigState } from 'src/app/maplibre-map/map-config.state';
import { AuthService } from '@services';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { PlanState } from '../plan.state';
import { of } from 'rxjs';
const fakeRoute = jasmine.createSpyObj(
  'ActivatedRoute',
  {},
  {
    snapshot: {
      paramMap: convertToParamMap({ id: '24' }),
    },
    children: [
      {
        snapshot: convertToParamMap({ id: '24' }),
      },
    ],
  }
);
describe('ScenarioMapComponent', () => {
  let component: ScenarioMapComponent;
  let fixture: ComponentFixture<ScenarioMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioMapComponent],
      providers: [
        MockProvider(PlanState, {
          planningAreaGeometry$: of({} as any),
        }),
        MockProviders(MapConfigState, AuthService),
        { provide: ActivatedRoute, useValue: fakeRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
