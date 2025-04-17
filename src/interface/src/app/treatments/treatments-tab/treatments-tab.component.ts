import { Component } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import {
  InputDirective,
  InputFieldComponent,
  NoResultsComponent,
  OpacitySliderComponent,
  SearchBarComponent,
  TreatmentPrescriptionComponent,
} from '@styleguide';
import { MatIconModule } from '@angular/material/icon';
import { Prescription } from '@types';
import { combineLatest, map, Observable } from 'rxjs';
import {
  PRESCRIPTIONS,
  PrescriptionSequenceAction,
  PrescriptionSingleAction,
} from '../prescriptions';
import { TreatmentsState } from '../treatments.state';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { LeftLoadingOverlayComponent } from '../left-loading-overlay/left-loading-overlay.component';
import { FeaturesModule } from 'src/app/features/features.module';

@Component({
  selector: 'app-project-area-tx-tab',
  standalone: true,
  imports: [
    CommonModule,
    InputDirective,
    InputFieldComponent,
    MatIconModule,
    NgIf,
    NgFor,
    OpacitySliderComponent,
    SearchBarComponent,
    LeftLoadingOverlayComponent,
    FeaturesModule,
    NoResultsComponent,
    TreatmentPrescriptionComponent,
  ],
  templateUrl: './treatments-tab.component.html',
  styleUrl: './treatments-tab.component.scss',
})
export class ProjectAreaTreatmentsTabComponent {
  constructor(
    private mapConfigState: MapConfigState,
    private treatmentsState: TreatmentsState
  ) {}

  opacity$ = this.mapConfigState.treatedStandsOpacity$;
  searchString: string = '';

  reloadingSummary$ = this.treatmentsState.reloadingSummary$;

  prescriptions$: Observable<Prescription[]> = combineLatest([
    this.treatmentsState.summary$,
    this.treatmentsState.projectAreaId$,
  ]).pipe(
    map(([summaryData, currentProjectId]) => {
      const filteredProjects = summaryData?.project_areas?.filter(
        (project) => project.project_area_id === currentProjectId
      );
      return filteredProjects && filteredProjects.length > 0
        ? filteredProjects[0].prescriptions
        : [];
    })
  );

  filteredPrescriptions$ = this.prescriptions$;

  projectAreaTotalAcres$ = this.treatmentsState.activeProjectArea$.pipe(
    map((pa) => pa?.total_area_acres)
  );

  handleOpacityChange(opacity: number) {
    this.mapConfigState.setTreatedStandsOpacity(opacity);
  }

  setSearchString(searchString: string) {
    this.searchString = searchString.toLowerCase();
    if (this.searchString === '' || this.searchString === null) {
      //no search string
      this.filteredPrescriptions$ = this.prescriptions$;
    } else {
      this.filteredPrescriptions$ = this.prescriptions$.pipe(
        map((prescriptions) =>
          prescriptions.filter((p) => {
            return (
              this.searchString === null ||
              p.action.toLowerCase().includes(this.searchString) ||
              (p.type === 'SINGLE' &&
                PRESCRIPTIONS.SINGLE[p.action as PrescriptionSingleAction]
                  .toLowerCase()
                  .includes(this.searchString)) ||
              (p.type === 'SEQUENCE' &&
                PRESCRIPTIONS.SEQUENCE[p.action as PrescriptionSequenceAction]
                  .map((d) => d.description)
                  .join(' ')
                  .toLowerCase()
                  .includes(this.searchString))
            );
          })
        )
      );
    }
  }

  clearSearch() {
    this.setSearchString('');
  }
}
