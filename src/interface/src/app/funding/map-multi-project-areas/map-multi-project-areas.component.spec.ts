import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapMultiProjectAreasComponent } from './map-multi-project-areas.component';
import { MockProvider } from 'ng-mocks';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

describe('MapMultiProjectAreasComponent', () => {
  let component: MapMultiProjectAreasComponent;
  let fixture: ComponentFixture<MapMultiProjectAreasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MapMultiProjectAreasComponent],
      providers: [
        MockProvider(MapConfigState, {
          opacity$: of(0.5),
          selectedProjectAreas$: of([]),
        }),
        MockProvider(MapConfigService),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MapMultiProjectAreasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
