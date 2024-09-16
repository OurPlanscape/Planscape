import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { PrescriptionActionsComponent } from '../prescription-actions/prescription-actions.component';
import { MatDividerModule } from '@angular/material/divider';
import { NotesSidebarComponent } from 'src/styleguide/notes-sidebar/notes-sidebar.component';
import { MatTabsModule } from '@angular/material/tabs';
import { SharedModule } from '@shared';
import { TreatmentsService } from '@services/treatments.service';
import { TreatmentPlan } from '@types';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentSummaryComponent } from '../treatment-summary/treatment-summary.component';

@Component({
  selector: 'app-project-area',
  standalone: true,
  imports: [
    SharedModule,
    TreatmentMapComponent,
    TreatmentSummaryComponent,
    JsonPipe,
    AsyncPipe,
    PrescriptionActionsComponent,
    MatDividerModule,
    NotesSidebarComponent,
    MatTabsModule,
  ],
  templateUrl: './treatment-project-area.component.html',
  styleUrl: './treatment-project-area.component.scss',
  // providers: [{ provide: PlanNotesService, useClass: PlanNotesService }],
})
export class TreatmentProjectAreaComponent implements OnInit {
  treatmentPlanId: number = this.route.snapshot.data['treatmentId'];
  projectAreaId: number = this.route.snapshot.data['projectAreaId'];

  treatmentPlan: TreatmentPlan | null = null;
  notesModel = 'project_area';

  constructor(
    private treatmentsService: TreatmentsService,
    private route: ActivatedRoute
  ) {}
  ngOnInit(): void {
    if (this.treatmentPlanId) {
      this.treatmentsService
        .getTreatmentPlan(Number(this.treatmentPlanId))
        .subscribe((r) => (this.treatmentPlan = r));
    }
  }
}
