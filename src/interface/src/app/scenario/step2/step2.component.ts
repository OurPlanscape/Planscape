import { Component, OnInit } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { StepDirective } from '../../../styleguide/steps/step.component';
import { IdNamePair, ScenarioCreation } from '@types';
import { NewScenarioState } from '../new-scenario.state';
import { ForsysService } from '@services/forsys.service';
import { FeatureService } from 'src/app/features/feature.service';

@Component({
  selector: 'app-step2',
  standalone: true,
  imports: [
    CommonModule,
    MatCheckboxModule,
    SectionComponent,
    ReactiveFormsModule,
  ],
  providers: [{ provide: StepDirective, useExisting: Step2Component }],
  templateUrl: './step2.component.html',
  styleUrl: './step2.component.scss',
})
export class Step2Component
  extends StepDirective<ScenarioCreation>
  implements OnInit
{
  constructor(
    private newScenarioState: NewScenarioState,
    private forsysService: ForsysService,
    private featureService: FeatureService
  ) {
    super();
  }

  form = new FormGroup({
    excluded_areas: new FormArray([]),
  });
  excludedAreas$ = this.forsysService.excludedAreas$;
  excludedAreas: IdNamePair[] = [];

  ngOnInit() {
    this.excludedAreas$.subscribe((areas) => {
      this.excludedAreas = areas;
      this.createFormControls();
      this.form.get('excluded_areas')?.valueChanges.subscribe(() => {
        this.newScenarioState.setExcludedAreas(this.getSelectedExcludedAreas());
      });
    });
  }

  private createFormControls() {
    const excludedAreasFormArray = this.form.get('excluded_areas') as FormArray;
    this.excludedAreas.forEach((area) => {
      excludedAreasFormArray.push(new FormControl(false));
    });
  }

  getSelectedExcludedAreas(): number[] {
    const excludedAreasFormArray = this.form.get('excluded_areas') as FormArray;
    const selectedKeys: number[] = [];
    excludedAreasFormArray.controls.forEach((control, index) => {
      if (control.value) {
        selectedKeys.push(this.excludedAreas[index].id);
      }
    });
    return selectedKeys;
  }

  getDraftData() {
    return { configuration: { excluded_areas: this.getSelectedExcludedAreas() }};
  }

  getPostData() {
    return { excluded_areas: this.getSelectedExcludedAreas() };
  }

  getData() {
    if (this.featureService.isFeatureEnabled('SCENARIO_DRAFTS')) {
      return this.getDraftData();
    } else {
      return this.getPostData();
    }
  }
}
