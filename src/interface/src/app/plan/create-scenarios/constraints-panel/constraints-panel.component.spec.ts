import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from 'src/app/material/material.module';

import { ConstraintsPanelComponent } from './constraints-panel.component';

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
      ],
      declarations: [ConstraintsPanelComponent],
      providers: [FormBuilder],
    }).compileComponents();

    fixture = TestBed.createComponent(ConstraintsPanelComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);

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
        maxCost: ['', Validators.min(0)],
      }),
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

  // it('should emit event when next button is clicked and form is valid', async () => {
  //   spyOn(component.formNextEvent, 'emit');
  //   const nextButton: MatButtonHarness = (
  //     await loader.getAllHarnesses(MatButtonHarness)
  //   )[0];
  //   // Set form to valid state
  //   component.constraintsForm?.get('budgetForm.estimatedCost')?.setValue('1');

  //   expect(component.constraintsForm?.valid).toBeTrue();
  //   expect(await nextButton.isDisabled()).toBeFalse();

  //   // Click next button
  //   await nextButton.click();

  //   expect(component.formNextEvent.emit).toHaveBeenCalledOnceWith();
  // });

  // it('should not emit event when next button is clicked and form is invalid', async () => {
  //   spyOn(component.formNextEvent, 'emit');
  //   const nextButton: MatButtonHarness = (
  //     await loader.getAllHarnesses(MatButtonHarness)
  //   )[0];

  //   expect(component.constraintsForm?.valid).toBeFalse();

  //   // Click next button
  //   await nextButton.click();

  //   expect(component.formNextEvent.emit).toHaveBeenCalledTimes(0);
  // });

  // it('should emit event when previous button is clicked', async () => {
  //   spyOn(component.formBackEvent, 'emit');
  //   const backButton: MatButtonHarness = (
  //     await loader.getAllHarnesses(MatButtonHarness)
  //   )[1];

  //   // Click back button
  //   await backButton.click();

  //   expect(component.formBackEvent.emit).toHaveBeenCalledOnceWith();
  // });

  it('should toggle whether max distance is required', async () => {
    const maxDistanceInput = component.constraintsForm?.get('excludeDistance');
    const maxDistanceCheckbox = (
      await loader.getAllHarnesses(MatCheckboxHarness)
    )[0];

    // Check the "Exclude areas off a road by" checkbox
    await maxDistanceCheckbox.check();

    expect(maxDistanceInput?.validator).toBeTruthy();

    // Uncheck the box
    await maxDistanceCheckbox.uncheck();

    expect(maxDistanceInput?.validator).toBeNull();
  });

  it('should toggle whether max slope is required', async () => {
    const maxSlopeInput = component.constraintsForm?.get('excludeSlope');
    const maxSlopeCheckbox = (
      await loader.getAllHarnesses(MatCheckboxHarness)
    )[1];

    // Check the "Exclude areas off a road by" checkbox
    await maxSlopeCheckbox.check();

    expect(maxSlopeInput?.validator).toBeTruthy();

    // Uncheck the box
    await maxSlopeCheckbox.uncheck();

    expect(maxSlopeInput?.validator).toBeNull();
  });
});
