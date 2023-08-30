import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from 'src/app/material/material.module';

import { ConstraintsPanelComponent } from './constraints-panel.component';
import { By } from '@angular/platform-browser';
import { MatFormField } from '@angular/material/form-field';
//TODO Add the following tests once implementation for tested behaviors is added/desired behavior is confirmed:
/**
 * 'marks maxCost as not required input if maxArea is provided'
 * 'marks maxArea as not required input if maxCost isprovided'
 */
describe('ConstraintsPanelComponent', () => {
  let component: ConstraintsPanelComponent;
  let fixture: ComponentFixture<ConstraintsPanelComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        MaterialModule,
        NoopAnimationsModule,
        MatButtonToggleModule,
      ],
      declarations: [ConstraintsPanelComponent],
      providers: [FormBuilder],
    }).compileComponents();
    fixture = TestBed.createComponent(ConstraintsPanelComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);

    var excludedAreasOptions = [
      'Private Land',
      'National Forests and Parks',
      'Wilderness Area',
      'Tribal Lands',
    ];
    var excludedAreasChosen: { [key: string]: (boolean | Validators)[] } = {};
    excludedAreasOptions.forEach((area: string) => {
      excludedAreasChosen[area] = [false, Validators.required];
    });
    const fb = fixture.componentRef.injector.get(FormBuilder);
    component.constraintsForm = fb.group({
      treatmentForm: fb.group({
        // Max area treated as a % of planning area
        maxArea: ['', [Validators.min(0), Validators.max(90)]],
      }),
      budgetForm: fb.group({
        // Estimated cost in $ per acre
        estimatedCost: ['', [Validators.min(0), Validators.required]],
        // Max cost of treatment for entire planning area
        maxCost: [{ value: '', disabled: true }, Validators.min(0)],
      }),
      physicalConstraintForm: fb.group({
        // Maximum slope allowed for planning area
        maxSlope: ['', Validators.min(0)],
        // Minimum distance from road allowed for planning area
        // TODO: Update variable name to minDistanceFromRoad
        minDistanceFromRoad: ['', Validators.min(0)],
        // Maximum area to be treated in acres 
        maxArea: ['', [Validators.min(0), Validators.required]],
        standSize: ['Large', Validators.required],
      }),
      excludedAreasForm: fb.group(excludedAreasChosen),
      excludeAreasByDegrees: [false],
      excludeAreasByDistance: [false],
      excludeSlope: [''],
      excludeDistance: [''],
    });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should disable maxCost input when no estimatedCost input is provided', async () => {
    let estimatedCostinput = fixture.debugElement.query(By.css('#estimatedCost')).nativeElement;
    estimatedCostinput.value = null;
    estimatedCostinput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.constraintsForm!.get('budgetForm.maxCost')!.disabled).toBe(true);
  });

  it('should enable maxCost input when estimatedCost input is provided', async () => {
    let estimatedCostinput = fixture.debugElement.query(By.css('#estimatedCost')).nativeElement;
    estimatedCostinput.value = 1;
    estimatedCostinput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.constraintsForm!.get('budgetForm.maxCost')!.enabled).toBe(true);
  });
});
