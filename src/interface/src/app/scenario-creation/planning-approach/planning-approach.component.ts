import { Component, Input, OnInit } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgxMaskModule } from 'ngx-mask';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { NgFor, NgIf } from '@angular/common';
import { NewScenarioState } from '../new-scenario.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { filter, take } from 'rxjs';
import { PLANNING_APPROACH } from '@types';

@UntilDestroy()
@Component({
  selector: 'app-planning-approach',
  standalone: true,
  imports: [
    SectionComponent,
    MatFormFieldModule,
    MatInputModule,
    NgxMaskModule,
    ReactiveFormsModule,
    MatRadioModule,
    NgFor,
    NgIf,
  ],
  templateUrl: './planning-approach.component.html',
  styleUrl: './planning-approach.component.scss',
})
export class PlanningApproachComponent implements OnInit {
  @Input() control!: FormControl<PLANNING_APPROACH | null>;

  readonly planningApproachOptions = [
    {
      value: 'PRIORITIZE_SUB_UNITS',
      title: 'Prioritize Sub-Units',
      description:
        'Would you like to prioritize existing sub-units within your Planning Area based on your scenario?',
      recommendation:
        'Recommended for Larger Planning Areas, e.g., National Forest or County',
      imageSrc: 'assets/png/sub-units.png',
      imageAlt: 'Ex. shows prioritized Subwatersheds',
      imageCaption: 'Ex. shows prioritized Subwatersheds.',
    },
    {
      value: 'OPTIMIZE_PROJECT_AREAS',
      title: 'Optimize Project Areas',
      description:
        'Would you like ForSys to create spatially optimized Project Areas within your Planning Area based on your scenario?',
      recommendation:
        'Recommended for Smaller Planning Areas, e.g., District or Watersheds',
      imageSrc: 'assets/png/project-areas.png',
      imageAlt: 'Ex. shows show optimized project areas',
      imageCaption: 'Ex. shows show optimized project areas.',
    },
  ];

  constructor(private newScenarioState: NewScenarioState) {}

  ngOnInit(): void {
    this.newScenarioState.scenarioConfig$
      .pipe(
        untilDestroyed(this),
        filter((c) => !!c?.planning_approach),
        take(1)
      )
      .subscribe((config) => {
        if (config.planning_approach) {
          this.control.setValue(config.planning_approach);
        }
      });
  }
}
