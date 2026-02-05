import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { CustomCobenefitsComponent } from '@app/scenario-creation/custom-cobenefits/custom-cobenefits.component';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';

describe('CustomCobenefitsComponent', () => {
  let component: CustomCobenefitsComponent;
  let fixture: ComponentFixture<CustomCobenefitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CustomCobenefitsComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        MockProvider(NewScenarioState, {
          scenarioConfig$: of({}),
          excludedStands$: of([]),
          doesNotMeetConstraintsStands$: of([]),
          stepIndex$: of(0),
        }),
        MockProvider(DataLayersStateService, {
          viewedDataLayer$: of(null),
          selectedDataLayers$: of([]),
          searchTerm$: of(''),
          selectedDataSet$: of(null),
          dataTree$: of(null),
          searchResults$: of(null),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomCobenefitsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
