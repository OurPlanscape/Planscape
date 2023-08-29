import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, take } from 'rxjs';

import { AuthService, PlanService } from 'src/app/services';
import { Plan, ProjectArea, Scenario, User } from 'src/app/types';
import { FeatureCollection } from 'geojson';
import area from '@turf/area';

const SQUARE_METERS_PER_ACRE = 0.0002471054;

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
  displayName = '';
  scenarioNotes: FormGroup;
  totalAcresTreated: number = 0;
  totalPlanningAreaAcres: number = 0;
  totalCostRange: string = 'tbd';

  constructor(
    private authService: AuthService,
    private planService: PlanService,
    private fb: FormBuilder,
    private matSnackBar: MatSnackBar
  ) {
    this.scenarioNotes = fb.group({
      notes: '',
    });
  }

  ngOnInit(): void {
    this.authService.loggedInUser$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.currentUser$.next(user);
        this.displayName = user.firstName
          ? user.firstName
          : user.username ?? '';
      } else {
        this.displayName = 'Guest';
      }
    });
    if (this.plan) {
      this.totalPlanningAreaAcres = this.calculateAcres(
        this.plan.planningArea!
      );
    }
    this.authService.loggedInUser$.pipe(take(1)).subscribe(this.currentUser$);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.scenario) {
      if (
        changes['scenario'].previousValue?.['notes'] !==
        changes['scenario'].currentValue?.['notes']
      ) {
        this.scenarioNotes.controls['notes'].setValue(this.scenario.notes);
      }
      if (this.scenario?.projectAreas) {
        this.scenario?.projectAreas.forEach((projectArea) => {
          projectArea.actualAcresTreated = this.calculateAcres(
            projectArea.projectArea
          );
        });
        this.totalAcresTreated = this.calculateTotalAcresTreated(
          this.scenario.projectAreas
        );
      }
    }
  }

  private calculateTotalAcresTreated(projectAreas: ProjectArea[]): number {
    return projectAreas.reduce((totalAcres, projectArea) => {
      return totalAcres + (projectArea.actualAcresTreated ?? 0);
    }, 0);
  }

  private calculateAcres(shape: GeoJSON.GeoJSON) {
    const squareMeters = area(shape as FeatureCollection);
    const acres = squareMeters * SQUARE_METERS_PER_ACRE;
    return Math.round(acres);
  }

  onSubmit(): void {
    if (!this.scenario) {
      return;
    }
    const updateScenario: Scenario = {
      ...this.scenario,
      notes: this.scenarioNotes.get('notes')?.value,
    };
    this.planService.updateScenarioNotes(updateScenario).subscribe({
      next: () => {
        this.matSnackBar.open('Successfully updated!', 'Dismiss', {
          duration: 10000,
          verticalPosition: 'top',
        });
      },
      error: () => {
        this.matSnackBar.open('[Error] Failed to update!', 'Dismiss', {
          duration: 10000,
          panelClass: ['snackbar-error'],
          verticalPosition: 'top',
        });
      },
    });
  }
}
