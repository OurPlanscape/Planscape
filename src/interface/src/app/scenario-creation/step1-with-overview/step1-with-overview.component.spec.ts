import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { Component, Input } from '@angular/core';

import { Step1WithOverviewComponent } from './step1-with-overview.component';
import { ProcessOverviewComponent } from '@scenario-creation/process-overview/process-overview.component';
import { StandSizeSelectorComponent } from '@scenario-creation/stand-size-selector/stand-size-selector.component';
import { TreatmentGoalSelectorComponent } from '@scenario-creation/treatment-goal-selector/treatment-goal-selector.component';
import { STAND_SIZE } from '@plan/plan-helpers';

// Mock components with control
@Component({ selector: 'sg-process-overview', template: '', standalone: true })
class MockProcessOverviewComponent {
  @Input() steps: any;
}

@Component({
  selector: 'app-stand-size-selector',
  template: '',
  standalone: true,
})
class MockStandSizeSelectorComponent {
  control = new FormControl<STAND_SIZE | null>(null);
}

@Component({
  selector: 'app-treatment-goal-selector',
  template: '',
  standalone: true,
})
class MockTreatmentGoalSelectorComponent {
  control = new FormControl<number | null>(null);
}

describe('Step1WithOverviewComponent', () => {
  let component: Step1WithOverviewComponent;
  let fixture: ComponentFixture<Step1WithOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Step1WithOverviewComponent],
    })
      .overrideComponent(Step1WithOverviewComponent, {
        remove: {
          imports: [
            ProcessOverviewComponent,
            StandSizeSelectorComponent,
            TreatmentGoalSelectorComponent,
          ],
        },
        add: {
          imports: [
            MockProcessOverviewComponent,
            MockStandSizeSelectorComponent,
            MockTreatmentGoalSelectorComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Step1WithOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
