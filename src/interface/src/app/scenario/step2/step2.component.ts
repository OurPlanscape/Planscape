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
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { filter, take } from 'rxjs';

@UntilDestroy()
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
    private forsysService: ForsysService
  ) {
    super();
  }

  form = new FormGroup({
    excluded_areas: new FormArray<FormControl<boolean>>([]),
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
      this.prefillExcludedAreas();
    });
  }

  private prefillExcludedAreas() {
    // Reading the config from the scenario state
    this.newScenarioState.scenarioConfig$
      .pipe(
        untilDestroyed(this),
        filter((c) => !!c?.excluded_areas),
        take(1)
      )
      .subscribe((config) => {
        let excluded_areas_value: boolean[] = [];
        this.excludedAreas.forEach((area) => {
          if (config.excluded_areas?.includes(area.id)) {
            excluded_areas_value.push(true);
          } else {
            excluded_areas_value.push(false);
          }
        });
        this.form.get('excluded_areas')?.setValue(excluded_areas_value);
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

  getData() {
    return { excluded_areas: this.getSelectedExcludedAreas() };
  }
}
