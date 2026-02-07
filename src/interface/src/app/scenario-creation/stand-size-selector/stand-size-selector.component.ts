import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, KeyValue, KeyValuePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { SectionComponent } from '@styleguide';
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
  templateUrl: './stand-size-selector.component.html',
  styleUrl: './stand-size-selector.component.scss',
})
export class StandSizeSelectorComponent implements OnInit {
  @Input() control!: FormControl<STAND_SIZE | null>;

  readonly standSizeOptions = STAND_OPTIONS;

  constructor(private newScenarioState: NewScenarioState) {}

  ngOnInit(): void {
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
    return this.control.value
      ? this.standSizeOptions[this.control.value]
      : null;
  }
}
