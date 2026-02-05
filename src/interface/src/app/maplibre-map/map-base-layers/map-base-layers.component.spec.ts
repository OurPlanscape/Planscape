import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { MapBaseLayersComponent } from '@app/maplibre-map/map-base-layers/map-base-layers.component';
import { MockProvider } from 'ng-mocks';
import { BaseLayersStateService } from '@app/base-layers/base-layers.state.service';
import { of } from 'rxjs';

describe('MapBaseLayersComponent', () => {
  let component: MapBaseLayersComponent;
  let fixture: ComponentFixture<MapBaseLayersComponent>;

  let mockMapLibreMap = {
    on: jasmine.createSpy('on'),
    off: jasmine.createSpy('off'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MapBaseLayersComponent],
      providers: [
        MockProvider(BaseLayersStateService, {
          selectedBaseLayers$: of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MapBaseLayersComponent);
    component = fixture.componentInstance;
    component.mapLibreMap = mockMapLibreMap as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
