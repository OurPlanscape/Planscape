import { Component } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import {
  InputDirective,
  InputFieldComponent,
  OpacitySliderComponent,
  SearchBarComponent,
  TreatmentExpanderComponent,
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
import { MapConfigState } from '../treatment-map/map-config.state';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';

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
    TreatmentExpanderComponent,
  ],
  templateUrl: './treatments-tab.component.html',
  styleUrl: './treatments-tab.component.scss',
})
export class ProjectAreaTreatmentsTabComponent {
  constructor(
    private mapConfigState: MapConfigState,
    private treatmentsState: TreatmentsState,
    private selectedStandsState: SelectedStandsState
  ) {}

  opacity$ = this.mapConfigState.treatedStandsOpacity$;
  searchString: string = '';

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
                PRESCRIPTIONS.SEQUENCE[
                  p.action as PrescriptionSequenceAction
                ].details
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

  highlightPrescriptions(tx: Prescription) {
    this.selectedStandsState.updateSelectedStands(tx.stand_ids);
  }
}
