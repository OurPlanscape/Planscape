import { Component } from '@angular/core';
import { AsyncPipe, JsonPipe, NgForOf, NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TreatmentsState } from '../treatments.state';
import { TreatmentSummary, Prescription } from '@types';
import { MatIconModule } from '@angular/material/icon';
import { ProjectAreaExpanderComponent } from '../../../styleguide/project-area-expander/project-area-expander.component';
import { SearchBarComponent } from '../../../styleguide/search-bar/search-bar.component';
import { map } from 'rxjs';
import { SearchResultCardComponent } from '../../../styleguide/search-result-card/search-result-card.component';
import {
  PRESCRIPTIONS,
  PrescriptionSingleAction,
  PrescriptionSequenceAction,
} from '../prescriptions';
@Component({
  selector: 'app-project-areas-tab',
  standalone: true,
  imports: [
    JsonPipe,
    NgForOf,
    NgIf,
    MatIconModule,
    RouterLink,
    AsyncPipe,
    SearchBarComponent,
    ProjectAreaExpanderComponent,
    SearchResultCardComponent,
  ],
  templateUrl: './project-areas-tab.component.html',
  styleUrl: './project-areas-tab.component.scss',
})
export class ProjectAreasTabComponent {
  summary$ = this.treatmentsState.summary$;
  projectAreas$ = this.summary$?.pipe(
    map((summary: TreatmentSummary | null) => summary?.project_areas)
  );
  filteredProjectAreas$ = this.projectAreas$;
  searchString: string = '';

  constructor(
    private treatmentsState: TreatmentsState,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  prescriptionsHaveMatch(prescriptions: Prescription[]) {
    return prescriptions.some((rx) => {
      return (
        (rx.type === 'SINGLE' &&
          PRESCRIPTIONS.SINGLE[rx.action as PrescriptionSingleAction]
            .toLowerCase()
            .includes(this.searchString)) ||
        (rx.type === 'SEQUENCE' &&
          PRESCRIPTIONS.SEQUENCE[rx.action as PrescriptionSequenceAction].name
            .toLowerCase()
            .includes(this.searchString))
      );
    });
  }

  doSearch(searchString: string) {
    this.searchString = searchString;
    if (!this.searchString) {
      this.filteredProjectAreas$ = this.projectAreas$;
    } else {
      this.filteredProjectAreas$ = this.projectAreas$.pipe(
        // this checks values of title, as well as the names of various treatments
        map((projectArea) =>
          projectArea?.filter(
            (p) =>
              p.project_area_name.toLowerCase().includes(this.searchString) ||
              this.prescriptionsHaveMatch(p.prescriptions)
          )
        )
      );
    }
  }

  setActiveProjectArea(projectAreaId: number) {
    this.router.navigate(['project-area', projectAreaId], {
      relativeTo: this.route,
    });
  }
}
