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
import { ScenarioState } from '../scenario.state';
import { StepDirective } from '../../../styleguide/steps/step.component';
import { ScenarioCreation } from '@types';

interface ExcludedArea {
  key: number;
  label: string;
  id: number;
}

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
  constructor(private scenarioState: ScenarioState) {
    super();
  }

  form = new FormGroup({
    excluded_areas: new FormArray([]),
  });
  excludedAreas$ = this.scenarioState.excludedAreas$;
  excludedAreas: ExcludedArea[] = [];

  ngOnInit() {
    this.excludedAreas$.subscribe((areas: ExcludedArea[]) => {
      this.excludedAreas = areas;
      this.createFormControls();
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
        selectedKeys.push(this.excludedAreas[index].key);
      }
    });
    return selectedKeys;
  }

  getData() {
    return { excluded_areas: this.getSelectedExcludedAreas() };
  }
}
