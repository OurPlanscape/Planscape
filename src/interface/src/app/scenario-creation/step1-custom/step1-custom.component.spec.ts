import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { Step1CustomComponent } from './step1-custom.component';
import { MockComponents, MockProvider } from 'ng-mocks';
import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { NewScenarioState } from '../new-scenario.state';
import { ProcessOverviewComponent } from '@scenario-creation/process-overview/process-overview.component';
import { StandSizeSelectorComponent } from '@scenario-creation/stand-size-selector/stand-size-selector.component';

describe('Step1CustomComponent', () => {
  let component: Step1CustomComponent;
  let fixture: ComponentFixture<Step1CustomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Step1CustomComponent, NoopAnimationsModule],
      declarations: [
        MockComponents(ProcessOverviewComponent, StandSizeSelectorComponent),
      ],
      providers: [
        MockProvider(NewScenarioState, {
          scenarioConfig$: new BehaviorSubject({}),
        }),
        MockProvider(ActivatedRoute, {
          snapshot: {
            data: {
              planId: 24,
            },
          } as any,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Step1CustomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
