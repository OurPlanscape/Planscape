import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseLayersComponent } from '@app/base-layers/base-layers/base-layers.component';
import { MockProvider } from 'ng-mocks';
import { BaseLayersStateService } from '@app/base-layers/base-layers.state.service';
import { of } from 'rxjs';
import { MapModuleService } from '@services/map-module.service';
import { FeaturesModule } from '@app/features/features.module';

describe('BaseLayersComponent', () => {
  let component: BaseLayersComponent;
  let fixture: ComponentFixture<BaseLayersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseLayersComponent, FeaturesModule],
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

    fixture = TestBed.createComponent(BaseLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
