import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanningApproachComponent } from '@scenario-creation/planning-approach/planning-approach.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MockProvider } from 'ng-mocks';
import { NewScenarioState } from '../new-scenario.state';
import { of } from 'rxjs';

type PlanningApproachValue = PlanningApproachComponent['control']['value'];

describe('PlanningApproachComponent', () => {
  let component: PlanningApproachComponent;
  let fixture: ComponentFixture<PlanningApproachComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PlanningApproachComponent,
        NoopAnimationsModule,
        ReactiveFormsModule,
      ],
      providers: [
        MockProvider(NewScenarioState, {
          scenarioConfig$: of({}),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanningApproachComponent);
    fixture.componentInstance.control = new FormControl<PlanningApproachValue>(
      null
    );
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
