import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TreatmentPlan, TreatmentsService } from '@services/treatments.service';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { SNACK_ERROR_CONFIG } from '@shared';

@Component({
  selector: 'app-treatments-tab',
  templateUrl: './treatments-tab.component.html',
  styleUrl: './treatments-tab.component.scss',
})
export class TreatmentsTabComponent implements OnInit {
  @Input() scenarioId!: string;

  state: 'loading' | 'empty' | 'loaded' = 'loading';

  treatments: TreatmentPlan[] = [];

  creatingTreatment = false;

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

  createTreatment() {
    this.creatingTreatment = true;

    this.treatmentsService
      .createTreatmentPlan(Number(this.scenarioId), 'New Treatment Plan')
      .subscribe({
        next: (result) => {
          this.router.navigate(['treatment', result.id], {
            relativeTo: this.route,
          });
        },
        error: () => {
          this.creatingTreatment = false;
          this.matSnackBar.open(
            '[Error] Cannot create a new treatment plan',
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
        },
      });
  }

  goToTreatment(id: number) {
    this.router.navigate(['treatment', id], { relativeTo: this.route });
  }
}
