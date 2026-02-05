import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  BrowserAnimationsModule,
  NoopAnimationsModule,
} from '@angular/platform-browser/animations';
import { NgxMaskModule } from 'ngx-mask';
import { TreatmentTargetComponent } from '@app/scenario-creation/treatment-target/treatment-target.component';
import { FormControl, FormGroup } from '@angular/forms';
import { MockProvider } from 'ng-mocks';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';
import { BehaviorSubject, of } from 'rxjs';
import { AvailableStands } from '@types';
import { STAND_SIZE } from '@app/plan/plan-helpers';

describe('TreatmentTargetComponent', () => {
  let component: TreatmentTargetComponent;
  let fixture: ComponentFixture<TreatmentTargetComponent>;
  const availableStandsData = new BehaviorSubject<AvailableStands>({
    summary: { treatable_area: 10000, treatable_stand_count: 123456 },
  } as AvailableStands);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        BrowserAnimationsModule,
        NgxMaskModule.forRoot(),
        TreatmentTargetComponent,
      ],
      providers: [
        MockProvider(NewScenarioState, {
          scenarioConfig$: of({ stand_size: 'LARGE' as STAND_SIZE }),
          availableStands$: availableStandsData.asObservable(),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentTargetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const updateForm = (max_project_count?: number, max_area?: number) =>
    new FormGroup({
      max_project_count: new FormControl(max_project_count),
      max_area: new FormControl(max_area),
    });

  it('should return null when any value is missing or 0', () => {
    const validator = (component as any).workingAreaValidator(1000);

    expect(validator(updateForm(undefined, 200))).toBeNull();
    expect(validator(updateForm(2, undefined))).toBeNull();
    expect(validator(updateForm(0, 200))).toBeNull();
    expect(validator(updateForm(2, 0))).toBeNull();
  });

  it('should return null when maxAreaValue is invalid', () => {
    const validatorZero = (component as any).workingAreaValidator(0);
    const validatorUndef = (component as any).workingAreaValidator(undefined);

    expect(validatorZero(updateForm(3, 400))).toBeNull();
    expect(validatorUndef(updateForm(3, 400))).toBeNull();
  });

  it('should return error when area exceeds maxAreaValue', () => {
    const validator = (component as any).workingAreaValidator(1000);
    const result = validator(updateForm(3, 400)); // 1200 > 1000
    expect(result).toEqual({ invalidWorkingArea: true });
  });

  it('should return null when area equals maxAreaValue (boundary)', () => {
    const validator = (component as any).workingAreaValidator(1000);
    const result = validator(updateForm(2, 500)); // 1000 == 1000
    expect(result).toBeNull();
  });

  it('should return null when area is below maxAreaValue', () => {
    const validator = (component as any).workingAreaValidator(1000);
    const result = validator(updateForm(2, 400)); // 800 < 1000
    expect(result).toBeNull();
  });

  it('should set an error when target acres does not meet minimum for MEDIUM stand size', () => {
    component.minAcreage = 100;
    const maxAreaField = component.form.get('max_area');
    maxAreaField?.setValue(60);
    expect(maxAreaField?.hasError('invalidMinAcres')).toEqual(true);
    expect(component.form?.valid).toEqual(false);
  });

  it('should set an error when target acres does not meet minimum for LARGE stand size', () => {
    component.minAcreage = 500;
    const maxAreaField = component.form.get('max_area');
    const maxProjectCount = component.form.get('max_project_count');
    maxProjectCount?.setValue(1);
    maxAreaField?.setValue(499);
    expect(component.form?.valid).toEqual(false);
    expect(maxAreaField?.hasError('invalidMinAcres')).toEqual(true);
  });

  it('should not set an error when target acres meets minimum area', () => {
    component.minAcreage = 100;
    const maxAreaField = component.form.get('max_area');
    const maxProjectCount = component.form.get('max_project_count');
    maxAreaField?.setValue(101);
    maxProjectCount?.setValue(1);
    expect(component.form?.valid).toEqual(true);
    expect(maxAreaField?.hasError('invalidMinAcres')).toEqual(false);
  });

  it('should set an error if target project areas is more than the treatable stand count', () => {
    const maxAreaField = component.form.get('max_area');
    const maxProjectCount = component.form.get('max_project_count');
    maxAreaField?.setValue(1);
    maxProjectCount?.setValue(222222);
    expect(component.form?.valid).toEqual(false);
    expect(maxProjectCount?.hasError('max')).toEqual(true);
  });

  it('should set an error if target project areas is more than the treatable stand count', () => {
    availableStandsData.next({
      summary: { treatable_area: 10000, treatable_stand_count: 100 },
    } as AvailableStands);
    const maxAreaField = component.form.get('max_area');
    const maxProjectCount = component.form.get('max_project_count');
    maxAreaField?.setValue(1);
    maxProjectCount?.setValue(101);
    expect(component.form?.valid).toEqual(false);
    expect(maxProjectCount?.hasError('max')).toEqual(true);
  });

  it('should not set an error if target project areas is less than the treatable stand count', () => {
    availableStandsData.next({
      summary: { treatable_area: 10000, treatable_stand_count: 100 },
    } as AvailableStands);
    const maxAreaField = component.form.get('max_area');
    const maxProjectCount = component.form.get('max_project_count');
    maxAreaField?.setValue(1);
    maxProjectCount?.setValue(99);
    expect(component.form?.valid).toEqual(true);
    expect(maxProjectCount?.hasError('max')).toEqual(false);
  });

  it('should set an error if target acres is greater than treatable_area, regardless of other field value', () => {
    availableStandsData.next({
      summary: { treatable_area: 10000, treatable_stand_count: 100 },
    } as AvailableStands);

    component.minAcreage = 500;
    const maxAreaField = component.form.get('max_area');
    const maxProjectCount = component.form.get('max_project_count');
    maxAreaField?.setValue(10001);
    maxProjectCount?.setValue(undefined);
    expect(component.form?.valid).toEqual(false);
    expect(maxAreaField?.hasError('max')).toEqual(true);
  });
});
