import { Component, Input, SimpleChanges, OnChanges, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { take, BehaviorSubject } from 'rxjs';
import { User, AuthService } from 'src/app/services';

import { Scenario, Plan, ProjectArea } from 'src/app/types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-outcome',
  templateUrl: './outcome.component.html',
  styleUrls: ['./outcome.component.scss'],
})
export class OutcomeComponent implements OnInit, OnChanges {
  @Input() plan: Plan | null = null;
  @Input() scenario: Scenario | null = null;
  currentUser$ = new BehaviorSubject<User | null>(null);
  scenarioNotes: FormGroup;
  totalAcresTreated: number = 0;
  totalCostRange: string = '';

  constructor(
    private authService: AuthService,
    private fb: FormBuilder) {
    // TODO: Call update scenario on submit.
    this.scenarioNotes = fb.group({
      notes: '',
    });
  }

  ngOnInit(): void {
    this.authService.loggedInUser$.pipe(take(1)).subscribe(this.currentUser$)
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
