import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapBaseLayersComponent } from './map-base-layers.component';
import { MockProvider } from 'ng-mocks';
import { BaseLayersStateService } from '../../base-layers/base-layers.state.service';
import { of } from 'rxjs';

describe('MapBaseLayersComponent', () => {
  let component: MapBaseLayersComponent;
  let fixture: ComponentFixture<MapBaseLayersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapBaseLayersComponent],
      providers: [
        MockProvider(BaseLayersStateService, {
          selectedBaseLayers$: of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MapBaseLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
