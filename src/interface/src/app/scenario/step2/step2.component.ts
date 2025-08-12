import { Component } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ScenarioState } from '../scenario.state';
import { StepDirective } from '../../../styleguide/steps/step.component';
import { ScenarioCreation } from '@types';

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
export class Step2Component extends StepDirective<ScenarioCreation> {
  constructor(private scenarioState: ScenarioState) {
    super();
  }

  excludedAreas$ = this.scenarioState.excludedAreas$;
  form: FormGroup = new FormGroup({
    configuration: new FormGroup({
      excluded_areas: new FormControl<number[]>([]),
    }),
  });

  onCheckboxChange(key: number, event: any) {
    const excludedAreas =
      this.form.get('configuration.excluded_areas')?.value || [];
    if (event.checked) {
      this.form
        .get('configuration.excluded_areas')
        ?.setValue([...excludedAreas, key]);
    } else {
      this.form
        .get('configuration.excluded_areas')
        ?.setValue(excludedAreas.filter((k: number) => k !== key));
    }
  }

  getData() {
    return this.form.value;
  }
}
