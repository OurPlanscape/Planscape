import { Component, Input, SimpleChanges, OnChanges, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

import { Scenario, Plan, ProjectArea } from 'src/app/types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-outcome',
  templateUrl: './outcome.component.html',
  styleUrls: ['./outcome.component.scss'],
})
export class OutcomeComponent implements OnChanges {
  @Input() plan: Plan | null = null;
  @Input() scenario: Scenario | null = null;
  scenarioNotes: FormGroup;
  totalAcresTreated: number = 0;
  totalCostRange: string = '';

  constructor(private fb: FormBuilder) {
    // TODO: Call update scenario on submit.
    this.scenarioNotes = fb.group({
      notes: '',
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.scenario) {
      if (
        changes['scenario'].previousValue?.['notes'] !==
        changes['scenario'].currentValue?.['notes']
      ) {
        this.scenarioNotes.controls['notes'].setValue(this.scenario.notes);
      }
      this.totalAcresTreated = this.calculateTotalAcresTreated(
        this.scenario.projectAreas || []
      );
    }
  }

  private calculateTotalAcresTreated(projectAreas: ProjectArea[]): number {
    return projectAreas.reduce((totalAcres, projectArea) => {
      return totalAcres + (projectArea.estimatedAreaTreated ?? 0);
    }, 0);
  }
}
