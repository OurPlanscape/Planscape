import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TreatmentPlan, TreatmentsService } from '@services/treatments.service';

@Component({
  selector: 'app-treatments-tab',
  templateUrl: './treatments-tab.component.html',
  styleUrl: './treatments-tab.component.scss',
})
export class TreatmentsTabComponent implements OnInit {
  @Input() scenarioId!: string;

  treatments: TreatmentPlan[] = [];

  creatingTreatment = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private treatmentsService: TreatmentsService
  ) {}

  ngOnInit(): void {
    this.loadTreatments();
  }

  loadTreatments() {
    this.treatmentsService
      .listTreatmentPlans(Number(this.scenarioId))
      .subscribe((results) => (this.treatments = results));
  }

  createTreatment() {
    this.creatingTreatment = true;

    // TODO Error handling
    this.treatmentsService
      .createTreatmentPlan(Number(this.scenarioId), 'new plan')
      .subscribe((result) => {
        this.router.navigate(['treatment', result.id], {
          relativeTo: this.route,
        });
      });
  }

  goToTreatment(id: number) {
    this.router.navigate(['treatment', id], { relativeTo: this.route });
  }
}
