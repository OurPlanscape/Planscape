import { AfterContentInit, Component, ViewChild } from '@angular/core';
import { Step1Component } from '../step1/step1.component';
import {
  OverviewStep,
  ProcessOverviewComponent,
} from '../process-overview/process-overview.component';
import { SectionComponent, StepDirective } from '@styleguide';
import { ScenarioCreation } from '@types';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SCENARIO_OVERVIEW_STEPS } from '../scenario.constants';
import { StandSizeComponent } from '../stand-size/stand-size.component';
import { KeyValuePipe, NgForOf, NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-step1-custom',
  standalone: true,
  imports: [
    Step1Component,
    ProcessOverviewComponent,
    StandSizeComponent,
    KeyValuePipe,
    MatFormFieldModule,
    MatIconModule,
    MatOptionModule,
    MatSelectModule,
    NgForOf,
    NgIf,
    ReactiveFormsModule,
    SectionComponent,
  ],
  templateUrl: './step1-custom.component.html',
  styleUrl: './step1-custom.component.scss',
  // required to "import" current step1
  providers: [{ provide: StepDirective, useExisting: Step1CustomComponent }],
})
export class Step1CustomComponent
  extends StepDirective<ScenarioCreation>
  implements AfterContentInit
{
  steps: OverviewStep[] = SCENARIO_OVERVIEW_STEPS;
  @ViewChild(StandSizeComponent, { static: true }) inner!: StandSizeComponent;

  ngAfterContentInit() {
    if (!this.inner) {
      throw new Error(
        'Step1CustomComponent: inner StandSizeComponent not found'
      );
    }
  }

  get form(): FormGroup {
    return this.inner!.form;
  }

  getData() {
    return this.inner!.getData();
  }
}
