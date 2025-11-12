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
import { FeatureService } from 'src/app/features/feature.service';

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
    private forsysService: ForsysService,
    private featureService: FeatureService
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

  get tooltipContent() {
    if (this.featureService.isFeatureEnabled('SCENARIO_CONFIG_UI')) {
      return `<b>What does it mean to exclude areas?</b>
Excluding areas lets you remove specific lands from your planning scenarios based on their Protected Area Status.

<b>What happens when I exclude areas?</b>
If you exclude areas, ForSys will not assign project areas or treatments on those lands. The acreage associated with the excluded lands will be removed from your Potential Treatable Area, and those stands will not be considered in the final scenario results.

<b>Where can I learn more about Protected Areas?</b>
For more information on Protected Area Status, visit the <a href='https://www.usgs.gov/programs/gap-analysis-project/science/pad-us-statistics-dashboard' target='_blank'>USGS Protected Areas Database.</a>`;
    } else {
      return `Choose to exclude areas from your planning scenarios based on Protected Area Status. If you choose to exclude these areas, project areas will not be assigned on these lands.
  
For more information regarding Protected Areas, click <a href='https://www.usgs.gov/programs/gap-analysis-project/science/pad-us-statistics-dashboard' target='_blank'>here</a>.`;
    }
  }
}
