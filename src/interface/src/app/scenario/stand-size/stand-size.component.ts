import { Component, OnInit } from '@angular/core';
import {
  AsyncPipe,
  KeyValue,
  KeyValuePipe,
  NgForOf,
  NgIf,
  NgTemplateOutlet,
} from '@angular/common';
import { ButtonComponent, SectionComponent, StepDirective } from '@styleguide';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { STAND_OPTIONS, STAND_SIZE } from '../../plan/plan-helpers';
import { filter, take } from 'rxjs';
import { NewScenarioState } from '../new-scenario.state';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ScenarioCreation } from '@types';

@UntilDestroy()
@Component({
  selector: 'app-stand-size',
  standalone: true,
  imports: [
    AsyncPipe,
    ButtonComponent,
    KeyValuePipe,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatMenuModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSelectModule,
    NgForOf,
    NgIf,
    NgTemplateOutlet,
    ReactiveFormsModule,
    SectionComponent,
  ],
  templateUrl: './stand-size.component.html',
  styleUrl: './stand-size.component.scss',
})
export class StandSizeComponent
  extends StepDirective<ScenarioCreation>
  implements OnInit
{
  form = new FormGroup({
    stand_size: new FormControl<STAND_SIZE | undefined>(undefined, [
      Validators.required,
    ]),
  });

  readonly standSizeOptions = STAND_OPTIONS;

  planId = this.route.parent?.snapshot.data['planId'];

  constructor(
    private newScenarioState: NewScenarioState,
    private route: ActivatedRoute
  ) {
    super();
  }

  ngOnInit(): void {
    // Reading the config from the scenario state
    this.newScenarioState.scenarioConfig$
      .pipe(
        untilDestroyed(this),
        filter((c) => !!c?.stand_size || !!c?.treatment_goal),
        take(1)
      )
      .subscribe((config) => {
        if (config.stand_size) {
          this.form.get('stand_size')?.setValue(config.stand_size);
        }
      });
  }

  reverseAlpha(a: KeyValue<string, any>, b: KeyValue<string, any>): number {
    return b.key.localeCompare(a.key);
  }

  getData() {
    return this.form.value;
  }

  get selectedStandSize() {
    const key = this.form.get('stand_size')?.value as STAND_SIZE | null;
    return key ? this.standSizeOptions[key] : null;
  }
}
