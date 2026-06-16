import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExcludeAreasSelectorComponent } from './exclude-areas-selector.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockProvider } from 'ng-mocks';
import { NewScenarioState } from '../new-scenario.state';
import { BehaviorSubject, of } from 'rxjs';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import { ForsysService } from '@services/forsys.service';
import { BaseLayer } from '@types';

describe('ExcludeAreasSelectorComponent', () => {
  let component: ExcludeAreasSelectorComponent;
  let fixture: ComponentFixture<ExcludeAreasSelectorComponent>;
  let scenarioConfig$: BehaviorSubject<any>;
  let state: NewScenarioState;

  beforeEach(async () => {
    scenarioConfig$ = new BehaviorSubject({});

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        NoopAnimationsModule,
        ExcludeAreasSelectorComponent,
      ],
      providers: [
        MockProvider(NewScenarioState, {
          excludedAreas$: of([]),
          scenarioConfig$,
        }),
        MockProvider(BaseLayersStateService, {
          selectedBaseLayers$: of([]),
        }),
        MockProvider(ForsysService, {
          excludedAreas$: of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExcludeAreasSelectorComponent);
    component = fixture.componentInstance;
    state = TestBed.inject(NewScenarioState);
    spyOn(state, 'setExcludedAreas');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reverts unsaved selection to the saved config when leaving the step', () => {
    scenarioConfig$.next({ excluded_areas: [1, 2] });
    // user makes an unsaved change
    component.handleSelectedItemsChange([{ id: 9 } as BaseLayer]);
    expect(state.setExcludedAreas).toHaveBeenCalledWith([9]);

    // going back (or saving) triggers the exit hook
    component.beforeStepExit();

    expect(state.setExcludedAreas).toHaveBeenCalledWith([1, 2]);
  });

  it('reverts to an empty list when the saved config has no excluded areas', () => {
    scenarioConfig$.next({});

    component.beforeStepExit();

    expect(state.setExcludedAreas).toHaveBeenCalledWith([]);
  });
});
