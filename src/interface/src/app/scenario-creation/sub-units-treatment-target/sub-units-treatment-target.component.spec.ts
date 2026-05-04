import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  BrowserAnimationsModule,
  NoopAnimationsModule,
} from '@angular/platform-browser/animations';
import { NgxMaskModule } from 'ngx-mask';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { SubUnitsTreatmentTargetComponent } from './sub-units-treatment-target.component';
import { ScenarioService } from '@app/services';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup } from '@angular/forms';
import { NewScenarioState } from '@scenario-creation/new-scenario.state';

describe('SubUnitsTreatmentTargetComponent', () => {
  let component: SubUnitsTreatmentTargetComponent;
  let fixture: ComponentFixture<SubUnitsTreatmentTargetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        BrowserAnimationsModule,
        NgxMaskModule.forRoot(),
        SubUnitsTreatmentTargetComponent,
      ],
      providers: [
        MockProvider(NewScenarioState, {
          scenarioConfig$: of({ stand_size: 'LARGE' as any }),
        }),
        MockProvider(ScenarioService, {
          getSubUnitsDetails: () => of({ min: 1, max: 2, avg: 2 }),
        }),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { scenarioId: 2 } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubUnitsTreatmentTargetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('workingAreaValidator', () => {
    const createForm = (
      sub_units_fixed_target: boolean,
      sub_units_target_value: number | null
    ) =>
      new FormGroup({
        sub_units_fixed_target: new FormControl(sub_units_fixed_target),
        sub_units_target_value: new FormControl(sub_units_target_value),
      });

    it('should return invalidAcres when fixed target is true and value is negative', () => {
      component.subUnitDetails = { min: 1, max: 10, avg: 5 };

      const form = createForm(true, -1);
      const validator = (component as any).workingAreaValidator();

      const result = validator(form);

      expect(result).toEqual({ invalidAcres: true });
    });

    it('should return invalidAcres when fixed target is true and value exceeds subUnitDetails.max', () => {
      component.subUnitDetails = { min: 1, max: 10, avg: 5 };

      const form = createForm(true, 11);
      const validator = (component as any).workingAreaValidator();

      const result = validator(form);

      expect(result).toEqual({ invalidAcres: true });
    });

    it('should return null when fixed target is true and value is valid', () => {
      component.subUnitDetails = { min: 1, max: 10, avg: 5 };

      const form = createForm(true, 5);
      const validator = (component as any).workingAreaValidator();

      const result = validator(form);

      expect(result).toBeNull();
    });

    it('should return invalidPercentage when fixed target is false and value is negative', () => {
      const form = createForm(false, -1);
      const validator = (component as any).workingAreaValidator();

      const result = validator(form);

      expect(result).toEqual({ invalidPercentage: true });
    });

    it('should return invalidPercentage when fixed target is false and value is greater than 100', () => {
      const form = createForm(false, 101);
      const validator = (component as any).workingAreaValidator();

      const result = validator(form);

      expect(result).toEqual({ invalidPercentage: true });
    });

    it('should return null when fixed target is false and percentage is valid', () => {
      const form = createForm(false, 50);
      const validator = (component as any).workingAreaValidator();

      const result = validator(form);

      expect(result).toBeNull();
    });

    it('should return null when fixed target is true and subUnitDetails.max is not defined', () => {
      component.subUnitDetails = { min: 1, max: 0, avg: 5 };

      const form = createForm(true, 999);
      const validator = (component as any).workingAreaValidator();

      const result = validator(form);

      expect(result).toBeNull();
    });
  });
});
