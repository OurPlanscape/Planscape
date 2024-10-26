import { Component, OnInit, OnDestroy } from '@angular/core';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { ProjectAreasTabComponent } from '../project-areas-tab/project-areas-tab.component';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Note, ProjectAreaNotesService, BaseNotesService } from '@services';
import { MatDividerModule } from '@angular/material/divider';
import {
  NotesSidebarComponent,
  NotesSidebarState,
} from 'src/styleguide/notes-sidebar/notes-sidebar.component';
import { TreatmentsService } from '@services/treatments.service';
import { TreatmentPlan } from '@types';
import { DeleteNoteDialogComponent } from '../../plan/delete-note-dialog/delete-note-dialog.component';
import { take } from 'rxjs';
import { SharedModule, SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { ProjectAreaTreatmentsTabComponent } from '../treatments-tab/treatments-tab.component';
import { OpacitySliderComponent } from '../../../styleguide/opacity-slider/opacity-slider.component';
import { MapConfigState } from '../treatment-map/map-config.state';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatmentsState } from '../treatments.state';

@Component({
  selector: 'app-project-area',
  standalone: true,
  providers: [
    { provide: BaseNotesService, useClass: ProjectAreaNotesService }, // Specify which service to use
  ],
  imports: [
    SharedModule,
    TreatmentMapComponent,
    MatTabsModule,
    ProjectAreasTabComponent,
    JsonPipe,
    AsyncPipe,
    MatDividerModule,
    NotesSidebarComponent,
    MatTabsModule,
    MatDialogModule,
    RouterLink,
    ProjectAreaTreatmentsTabComponent,
    OpacitySliderComponent,
  ],
  templateUrl: './treatment-project-area.component.html',
  styleUrl: './treatment-project-area.component.scss',
})
export class TreatmentProjectAreaComponent implements OnDestroy, OnInit {
  constructor(
    private mapConfigState: MapConfigState,
    private selectedStandsState: SelectedStandsState,
    private treatmentsState: TreatmentsState,
    private treatmentsService: TreatmentsService,
    private route: ActivatedRoute,
    private notesService: ProjectAreaNotesService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar
  ) {}

  opacity = this.mapConfigState.treatedStandsOpacity$;

  changeValue(num: number) {
    this.mapConfigState.setTreatedStandsOpacity(num);
  }

  ngOnDestroy(): void {
    this.selectedStandsState.clearStands();
    this.treatmentsState.setShowApplyTreatmentsDialog(false);
  }

  treatmentPlanId: number = this.route.snapshot.data['treatmentId'];
  projectAreaId: number = this.route.snapshot.data['projectAreaId'];

  treatmentPlan: TreatmentPlan | null = null;
  notesModel = 'project_area';

  ngOnInit(): void {
    if (this.treatmentPlanId) {
      this.treatmentsService
        .getTreatmentPlan(Number(this.treatmentPlanId))
        .subscribe((r) => (this.treatmentPlan = r));
    }
  }

  // notes data
  projectId: number = 0;
  notes: Note[] = [];
  notesSidebarState: NotesSidebarState = 'READY';

  //notes handling functions
  addNote(comment: string) {
    this.notesSidebarState = 'SAVING';
    this.notesService.addNote(this.projectId, comment).subscribe((note) => {
      this.notes.unshift(note);
      this.loadNotes();
    });
    this.notesSidebarState = 'READY';
  }

  handleNoteDelete(n: Note) {
    const dialogRef = this.dialog.open(DeleteNoteDialogComponent, {});
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.notesService.deleteNote(this.projectId, n.id).subscribe({
            next: () => {
              this.snackbar.open(
                `Deleted note`,
                'Dismiss',
                SNACK_NOTICE_CONFIG
              );
              this.loadNotes();
            },
            error: (err) => {
              this.snackbar.open(
                `Error: ${err.statusText}`,
                'Dismiss',
                SNACK_ERROR_CONFIG
              );
            },
          });
        }
      });
  }

  loadNotes() {
    this.notesService.getNotes(this.projectId).subscribe((notes) => {
      this.notes = notes;
    });
  }
}
