import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanningApproachComponent } from '@scenario-creation/planning-approach/planning-approach.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

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
    }).compileComponents();

    fixture = TestBed.createComponent(PlanningApproachComponent);
    fixture.componentInstance.control =
      new FormControl<PlanningApproachValue>(null);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
