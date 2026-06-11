import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Step1WithOverviewComponent } from './step1-with-overview.component';
import { MockComponents, MockProvider } from 'ng-mocks';
import { ProcessOverviewComponent } from '@scenario-creation/process-overview/process-overview.component';
import { StandSizeSelectorComponent } from '@scenario-creation/stand-size-selector/stand-size-selector.component';
import { TreatmentGoalSelectorComponent } from '@scenario-creation/treatment-goal-selector/treatment-goal-selector.component';
import { PlanningApproachComponent } from '@scenario-creation/planning-approach/planning-approach.component';
import { FeatureService } from '@app/features/feature.service';

describe('Step1WithOverviewComponent', () => {
  let component: Step1WithOverviewComponent;
  let fixture: ComponentFixture<Step1WithOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Step1WithOverviewComponent],
      declarations: [
        MockComponents(
          ProcessOverviewComponent,
          StandSizeSelectorComponent,
          TreatmentGoalSelectorComponent,
          PlanningApproachComponent
        ),
      ],
      providers: [MockProvider(FeatureService)],
    }).compileComponents();

    fixture = TestBed.createComponent(Step1WithOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
