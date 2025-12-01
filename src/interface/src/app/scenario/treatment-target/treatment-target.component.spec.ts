import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  BrowserAnimationsModule,
  NoopAnimationsModule,
} from '@angular/platform-browser/animations';
import { NgxMaskModule } from 'ngx-mask';
import { TreatmentTargetComponent } from './treatment-target.component';
import { FormControl, FormGroup } from '@angular/forms';
import { MockProvider } from 'ng-mocks';
import { NewScenarioState } from '../new-scenario.state';
import { of } from 'rxjs';
import { AvailableStands } from '@types';

describe('TreatmentTargetComponent', () => {
  let component: TreatmentTargetComponent;
  let fixture: ComponentFixture<TreatmentTargetComponent>;

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
          availableStands$: of({
            summary: { treatable_area: 10000 },
          } as AvailableStands),
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

  it('should return error when target acres does not meet minimum for medium stand size', () => {
    component.minAcreage = 100;
    const maxAreaField = component.form.get('max_area');
    maxAreaField?.setValue(60);
    expect(maxAreaField?.hasError('invalidMinAcres')).toEqual(true);
    expect(component.form?.valid).toEqual(false);
  });

  it('should return error when target acres does not meet minimum for large stand size', () => {
    component.minAcreage = 500;
    const maxAreaField = component.form.get('max_area');
    maxAreaField?.setValue(499);
    expect(component.form?.valid).toEqual(false);
    expect(maxAreaField?.hasError('invalidMinAcres')).toEqual(true);
  });

  it('should return error if target acres is greater than treatable_area, regardless of other field value', () => {
    component.minAcreage = 500;
    const maxAreaField = component.form.get('max_area');
    const maxProjectCount = component.form.get('max_project_count');
    maxAreaField?.setValue(10001); // see treatable_area above
    maxProjectCount?.setValue(undefined);
    expect(component.form?.valid).toEqual(false);
    expect(maxAreaField?.hasError('max')).toEqual(true);
  });

  it('should not return error when target acres meets minimum area', () => {
    component.minAcreage = 100;
    const maxAreaField = component.form.get('max_area');
    maxAreaField?.setValue(101);
    expect(component.form?.valid).toEqual(false);
    expect(maxAreaField?.hasError('invalidMinAcres')).toEqual(false);
  });
});
