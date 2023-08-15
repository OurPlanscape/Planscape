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
import { MatButtonToggleModule } from '@angular/material/button-toggle';
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
        MatButtonToggleModule,
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
      physicalConstraintForm: fb.group({
        // Maximum slope allowed for planning area
        maxSlope: ['', Validators.min(0)],
        // Maximum road distance
        maxRoadDistance: ['', Validators.min(0)],
        standSize: ['Large', Validators.required],
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



});
