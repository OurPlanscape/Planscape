import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LegacyMaterialModule } from '../../../material/legacy-material.module';
import { ConstraintsPanelComponent } from './constraints-panel.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FeaturesModule } from '../../../features/features.module';
import { MockProvider } from 'ng-mocks';
import { ScenarioState } from 'src/app/maplibre-map/scenario.state';
import { BehaviorSubject } from 'rxjs';
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
        LegacyMaterialModule,
        NoopAnimationsModule,
        MatButtonToggleModule,
        FeaturesModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      declarations: [ConstraintsPanelComponent],
      providers: [
        FormBuilder,
        MockProvider(ScenarioState, {
          excludedAreas$: new BehaviorSubject([1, 2, 3] as any),
        }),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ConstraintsPanelComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    component.createForm();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
