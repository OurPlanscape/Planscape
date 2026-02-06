import { Component, OnInit } from '@angular/core';
import { CommonModule, KeyValue, KeyValuePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { FormFragment, formFragmentProviders, SectionComponent } from '@styleguide';
import { STAND_OPTIONS, STAND_SIZE } from '@plan/plan-helpers';
import { NewScenarioState } from '../new-scenario.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { filter, take } from 'rxjs';

@UntilDestroy()
@Component({
  selector: 'app-stand-size-selector',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    KeyValuePipe,
    SectionComponent,
  ],
  providers: formFragmentProviders(StandSizeSelectorComponent),
  templateUrl: './stand-size-selector.component.html',
  styleUrl: './stand-size-selector.component.scss',
})
export class StandSizeSelectorComponent
  extends FormFragment<STAND_SIZE | undefined>
  implements OnInit
{
  control = new FormControl<STAND_SIZE | undefined>(undefined, {
    validators: [Validators.required],
    nonNullable: true,
  });

  readonly standSizeOptions = STAND_OPTIONS;

  constructor(private newScenarioState: NewScenarioState) {
    super();
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.newScenarioState.scenarioConfig$
      .pipe(
        untilDestroyed(this),
        filter((c) => !!c?.stand_size),
        take(1)
      )
      .subscribe((config) => {
        if (config.stand_size) {
          this.control.setValue(config.stand_size);
        }
      });
  }

  reverseAlpha(a: KeyValue<string, any>, b: KeyValue<string, any>): number {
    return b.key.localeCompare(a.key);
  }

  get selectedStandSize() {
    const key = this.control.value as STAND_SIZE | null;
    return key ? this.standSizeOptions[key] : null;
  }
}
