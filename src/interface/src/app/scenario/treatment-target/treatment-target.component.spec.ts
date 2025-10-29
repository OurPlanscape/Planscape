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

describe('Step4LegacyComponent', () => {
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
          availableStands$: of({ summary: {} } as AvailableStands),
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
    const validator = (component as any).minAreaValidator();
    component.minAcreage = 100;
    const result = validator(updateForm(9, 90)); // 90 < 100
    expect(result).toEqual({ invalidMinAcres: true });
  });

  it('should return error when  target acres does not meet minimum for large stand size', () => {
    const validator = (component as any).minAreaValidator();
    component.minAcreage = 500;
    const result = validator(updateForm(9, 400)); // 400 < 500
    expect(result).toEqual({ invalidMinAcres: true });
  });

  it('should not return error when target acres meets minimum area', () => {
    const validator = (component as any).minAreaValidator();
    component.minAcreage = 100;
    const result = validator(updateForm(9, 101)); // 360 > 100
    expect(result).toBeNull();
  });
});
