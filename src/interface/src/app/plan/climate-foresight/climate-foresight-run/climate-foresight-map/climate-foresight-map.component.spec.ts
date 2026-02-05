import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClimateForesightMapComponent } from '@app/plan/climate-foresight/climate-foresight-run/climate-foresight-map/climate-foresight-map.component';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { MockProvider, MockProviders } from 'ng-mocks';
import { AuthService } from '@services';
import { PlanState } from '@app/plan/plan.state';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { of } from 'rxjs';

describe('ClimateForesightMapComponent', () => {
  let component: ClimateForesightMapComponent;
  let fixture: ComponentFixture<ClimateForesightMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClimateForesightMapComponent],
      providers: [
        MockProviders(MapConfigState, AuthService, MapConfigService),
        MockProvider(PlanState, {
          planningAreaGeometry$: of({} as any),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClimateForesightMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
