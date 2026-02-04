import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CustomPriorityObjectivesComponent } from './custom-priority-objectives.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';
import { MockProvider } from 'ng-mocks';
import { NewScenarioState } from '../new-scenario.state';
import { of } from 'rxjs';

describe('CustomPriorityObjectivesComponent', () => {
  let component: CustomPriorityObjectivesComponent;
  let fixture: ComponentFixture<CustomPriorityObjectivesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CustomPriorityObjectivesComponent,
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

    fixture = TestBed.createComponent(CustomPriorityObjectivesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
