import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from 'src/app/material/material.module';
import { ConstraintsPanelComponent } from './constraints-panel.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FeaturesModule } from '../../../features/features.module';
//TODO Add the following tests once implementation for tested behaviors is added/desired behavior is confirmed:
/**
 * 'marks maxCost as not required input if maxArea is provided'
 * 'marks maxArea as not required input if maxCost isprovided'
 */
describe('ConstraintsPanelComponent', () => {
  let component: ConstraintsPanelComponent;
  let fixture: ComponentFixture<ConstraintsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        MaterialModule,
        NoopAnimationsModule,
        MatButtonToggleModule,
        FeaturesModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      declarations: [ConstraintsPanelComponent],
      providers: [FormBuilder],
    }).compileComponents();
    fixture = TestBed.createComponent(ConstraintsPanelComponent);
    component = fixture.componentInstance;

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
        estimatedCost: [2470, [Validators.min(0), Validators.required]],
        // Max cost of treatment for entire planning area
        maxCost: ['', Validators.min(0)],
      }),
      physicalConstraintForm: fb.group({
        // Maximum slope allowed for planning area
        maxSlope: [37, Validators.min(0)],
        // Minimum distance from road allowed for planning area
        // TODO: Update variable name to minDistanceFromRoad
        minDistanceFromRoad: [1000, Validators.min(0)],
        // Maximum area to be treated in acres
        maxArea: ['', [Validators.min(0)]],
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
});
