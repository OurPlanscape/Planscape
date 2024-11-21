import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TreatmentsService } from '@services/treatments.service';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { Plan, TreatmentPlan, TreatmentStatus } from '@types';
import {
  canDeleteTreatmentPlan,
  canCloneTreatmentPlan,
} from '../../permissions';

@Component({
  selector: 'app-treatments-tab',
  templateUrl: './treatments-tab.component.html',
  styleUrl: './treatments-tab.component.scss',
})
export class TreatmentsTabComponent implements OnInit {
  @Input() scenarioId!: string;
  @Input() planningArea: Plan | null = null;

  state: 'loading' | 'empty' | 'loaded' = 'loading';

  treatments: TreatmentPlan[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private treatmentsService: TreatmentsService,
    private matSnackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadTreatments();
  }

  loadTreatments() {
    this.treatmentsService
      .listTreatmentPlans(Number(this.scenarioId))
      .subscribe((results) => {
        this.treatments = results;
        this.state = results.length > 0 ? 'loaded' : 'empty';
      });
  }

  goToTreatment(id: number, status: TreatmentStatus) {
    const route = ['treatment', id];
    if (status === 'SUCCESS') {
      route.push('impacts');
    }

    this.router.navigate(route, { relativeTo: this.route });
  }

  userCanDelete(): boolean {
    console.log('is planning area set for delete? ', this.planningArea);
    if (this.planningArea) {
      console.log(
        'is permission set for delete? ',
        canDeleteTreatmentPlan(this.planningArea)
      );
    }
    console.log(
      'so the result should be: ',
      this.planningArea !== null && canDeleteTreatmentPlan(this.planningArea)
    );
    return (
      this.planningArea !== null && canDeleteTreatmentPlan(this.planningArea)
    );
  }

  userCanDuplicate(): boolean {
    console.log('is planning area set? ', this.planningArea);
    if (this.planningArea) {
      console.log(
        'is permission set? ',
        canCloneTreatmentPlan(this.planningArea)
      );
    }
    console.log(
      'so the result should be: ',
      this.planningArea !== null && canCloneTreatmentPlan(this.planningArea)
    );

    return (
      this.planningArea !== null && canCloneTreatmentPlan(this.planningArea)
    );
  }

  deleteTreatment(treatment: TreatmentPlan) {
    this.treatmentsService.deleteTreatmentPlan(treatment.id).subscribe({
      next: () => {
        this.treatments = this.treatments.filter((t) => t.id != treatment.id);
        this.state = this.treatments.length > 0 ? 'loaded' : 'empty';
        this.matSnackBar.open(
          `Deleted Treatment Plan '${treatment.name}'`,
          'Dismiss',
          SNACK_NOTICE_CONFIG
        );
      },
      error: () => {
        this.matSnackBar.open(
          `[Error] Cannot delete treatment plan '${treatment.name}'`,
          'Dismiss',
          SNACK_ERROR_CONFIG
        );
      },
    });
  }

  duplicateTreatment(treatment: TreatmentPlan) {
    this.treatmentsService.duplicateTreatmentPlan(treatment.id).subscribe({
      next: (t) => {
        this.treatments = [...this.treatments, t];
        this.matSnackBar.open(
          `Duplicated Treatment Plan '${treatment.name}'`,
          'Dismiss',
          SNACK_NOTICE_CONFIG
        );
      },
      error: () => {
        this.matSnackBar.open(
          `[Error] Cannot duplicate treatment plan '${treatment.name}'`,
          'Dismiss',
          SNACK_ERROR_CONFIG
        );
      },
    });
  }
}
