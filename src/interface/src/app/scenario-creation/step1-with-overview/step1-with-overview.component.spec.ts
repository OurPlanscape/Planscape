import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Step1WithOverviewComponent } from './step1-with-overview.component';
import { MockComponents } from 'ng-mocks';
import { ProcessOverviewComponent } from '@scenario-creation/process-overview/process-overview.component';
import { StandSizeSelectorComponent } from '@scenario-creation/stand-size-selector/stand-size-selector.component';
import { TreatmentGoalSelectorComponent } from '@scenario-creation/treatment-goal-selector/treatment-goal-selector.component';
import { FeaturesModule } from '@features/features.module';

describe('Step1WithOverviewComponent', () => {
  let component: Step1WithOverviewComponent;
  let fixture: ComponentFixture<Step1WithOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Step1WithOverviewComponent, FeaturesModule],
      declarations: [
        MockComponents(
          ProcessOverviewComponent,
          StandSizeSelectorComponent,
          TreatmentGoalSelectorComponent
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Step1WithOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
