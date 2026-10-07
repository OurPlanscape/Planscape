import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { BaseLayersComponent } from './base-layers.component';
import { MockProvider } from 'ng-mocks';
import { BaseLayersStateService } from '../base-layers.state.service';
import { of } from 'rxjs';
import { MapModuleService } from '@services/map-module.service';
import { FeaturesModule } from '@features/features.module';

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

  it('hides the search bar by default', () => {
    expect(fixture.debugElement.query(By.css('sg-search-bar'))).toBeNull();
  });

  it('shows the search bar when showSearch is set', () => {
    component.showSearch = true;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('sg-search-bar'))).toBeTruthy();
  });
});
