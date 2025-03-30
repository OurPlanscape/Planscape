import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DirectImpactsMapComponent } from './direct-impacts-map.component';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { AuthService } from '@services';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TreatmentsState } from '../treatments.state';

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
