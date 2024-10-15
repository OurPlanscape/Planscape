import { Component } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import {
  SearchBarComponent,
  OpacitySliderComponent,
  TreatmentExpanderComponent,
  InputFieldComponent,
  InputDirective,
} from '@styleguide';
import { MatIconModule } from '@angular/material/icon';
import { Prescription } from '@types';
import { map, combineLatest, Observable } from 'rxjs';
import {
  PRESCRIPTIONS,
  PrescriptionSequenceAction,
  PrescriptionSingleAction,
} from '../prescriptions';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { TreatmentsState } from '../treatments.state';

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
    private treatedStandsState: TreatedStandsState,
    private treatmentsState: TreatmentsState
  ) {}
  opacity = this.treatedStandsState.opacity$;
  summary$ = this.treatmentsState.summary$;
  projId$ = this.treatmentsState.projectAreaId$;
  searchString: string | null = null;

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
    this.treatedStandsState.setOpacity(opacity);
  }

  setSearchString(searchString: string) {
    this.searchString = searchString;
    if (this.searchString === '') {
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
                ].name
                  .toLowerCase()
                  .includes(this.searchString))
            );
          })
        )
      );
    }
  }
}
