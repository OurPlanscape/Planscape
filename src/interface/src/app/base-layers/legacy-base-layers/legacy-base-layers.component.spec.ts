import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LegacyBaseLayersComponent } from './legacy-base-layers.component';
import { MockProvider } from 'ng-mocks';
import { BaseLayersStateService } from '../base-layers.state.service';
import { of } from 'rxjs';
import { MapModuleService } from '@services/map-module.service';

describe('LegacyBaseLayersComponent', () => {
  let component: LegacyBaseLayersComponent;
  let fixture: ComponentFixture<LegacyBaseLayersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LegacyBaseLayersComponent],
      providers: [
        MockProvider(MapModuleService, {
          datasets$: of({
            main_datasets: [],
            base_datasets: [],
          }),
        }),
        MockProvider(BaseLayersStateService, {
          selectedBaseLayers$: of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LegacyBaseLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
