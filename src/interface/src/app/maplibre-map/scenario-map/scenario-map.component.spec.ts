import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioMapComponent } from './scenario-map.component';
import { MockProviders } from 'ng-mocks';
import { MapConfigState } from 'src/app/maplibre-map/map-config.state';
import { AuthService } from '@services';

describe('ScenarioMapComponent', () => {
  let component: ScenarioMapComponent;
  let fixture: ComponentFixture<ScenarioMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioMapComponent],
      providers: [MockProviders(MapConfigState, AuthService)],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
