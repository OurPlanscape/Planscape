import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncludeAreasSelectorComponent } from './include-areas-selector.component';
import { MockProvider } from 'ng-mocks';
import { NewScenarioState } from '../new-scenario.state';
import { BehaviorSubject, of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ExcludeAreasSelectorComponent } from '../exclude-areas-selector/exclude-areas-selector.component';
import { BaseLayersStateService } from '@app/base-layers/base-layers.state.service';
import { ForsysService } from '@app/services/forsys.service';
import { BaseLayer } from '@app/types';

describe('IncludeAreasSelectorComponent', () => {
  let component: IncludeAreasSelectorComponent;
  let fixture: ComponentFixture<IncludeAreasSelectorComponent>;
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
          includedAreas$: of([]),
          scenarioConfig$,
        }),
        MockProvider(BaseLayersStateService, {
          selectedBaseLayers$: of([]),
        }),
        MockProvider(ForsysService, {
          includedAreas$: of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncludeAreasSelectorComponent);
    component = fixture.componentInstance;
    state = TestBed.inject(NewScenarioState);
    spyOn(state, 'setIncludedAreas');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reverts unsaved selection to the saved config when leaving the step', () => {
    scenarioConfig$.next({ included_areas: [1, 2] });
    // user makes an unsaved change
    component.handleSelectedItemsChange([{ id: 9 } as BaseLayer]);
    expect(state.setIncludedAreas).toHaveBeenCalledWith([9]);

    // going back (or saving) triggers the exit hook
    component.beforeStepExit();

    expect(state.setIncludedAreas).toHaveBeenCalledWith([1, 2]);
  });

  it('reverts to an empty list when the saved config has no included areas', () => {
    scenarioConfig$.next({});

    component.beforeStepExit();

    expect(state.setIncludedAreas).toHaveBeenCalledWith([]);
  });
});
