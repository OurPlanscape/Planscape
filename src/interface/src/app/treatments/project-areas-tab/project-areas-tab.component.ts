import { Component } from '@angular/core';
import { AsyncPipe, JsonPipe, NgForOf, NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TreatmentsState } from '../treatments.state';
import { TreatmentSummary } from '@types';
import { ProjectAreaExpanderComponent } from '../../../styleguide/project-area-expander/project-area-expander.component';
import { SearchBarComponent } from '../../../styleguide/search-bar/search-bar.component';
import { map } from 'rxjs';

@Component({
  selector: 'app-project-areas-tab',
  standalone: true,
  imports: [
    JsonPipe,
    NgForOf,
    NgIf,
    RouterLink,
    AsyncPipe,
    SearchBarComponent,
    ProjectAreaExpanderComponent,
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

  doSearch(searchString: string) {
    this.searchString = searchString;
    if (this.searchString === '') {
      this.filteredProjectAreas$ = this.projectAreas$;
    } else {
      this.filteredProjectAreas$ = this.projectAreas$.pipe(
        map((projectArea) =>
          projectArea?.filter((p) =>
            p.project_area_name.toLowerCase().includes(this.searchString)
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
