import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { STAND_OPTIONS, STAND_SIZE } from '@plan/plan-helpers';

@Component({
  selector: 'app-scenario-summary',
  standalone: true,
  imports: [SectionComponent, NgIf],
  templateUrl: './scenario-summary.component.html',
  styleUrl: './scenario-summary.component.scss',
})
export class ScenarioSummaryComponent {
  @Input() planningApproach?: string;

  @Input() treatmentGoal?: string;

  @Input() priorityObjectives?: string;

  @Input() standSize: STAND_SIZE | null = null;

  standSizeOptions = STAND_OPTIONS;
}
