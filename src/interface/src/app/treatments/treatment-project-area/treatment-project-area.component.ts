import { Component, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Note, ProjectAreaNotesService } from '@services';
import { MatDividerModule } from '@angular/material/divider';
import {
  NotesSidebarComponent,
  NotesSidebarState,
  TreatmentStandsProgressBarComponent,
} from '@styleguide';
import { TreatmentsService } from '@services/treatments.service';
import { TreatmentPlan } from '@types';
import { DeleteNoteDialogComponent } from '../../plan/delete-note-dialog/delete-note-dialog.component';
import { take } from 'rxjs';
import { SharedModule, SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { ProjectAreaTreatmentsTabComponent } from '../treatments-tab/treatments-tab.component';
import { MapConfigState } from '../treatment-map/map-config.state';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatmentsState } from '../treatments.state';
import { getTreatedStandsTotal } from '../prescriptions';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';

@Component({
  selector: 'app-project-area',
  standalone: true,
  providers: [ProjectAreaNotesService],
  imports: [
    AsyncPipe,
    MapBaseLayerComponent,
    MatDialogModule,
    MatDividerModule,
    MatTabsModule,
    NgIf,
    NotesSidebarComponent,
    ProjectAreaTreatmentsTabComponent,
    SharedModule,
    TreatmentStandsProgressBarComponent,
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
  activeProjectArea$ = this.treatmentsState.activeProjectArea$;
  getTreatedStandsTotal = getTreatedStandsTotal;

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
    this.loadNotes();
  }

  // notes data
  notes: Note[] = [];
  notesSidebarState: NotesSidebarState = 'READY';

  //notes handling functions
  addNote(comment: string) {
    this.notesSidebarState = 'SAVING';
    if (this.projectAreaId) {
      this.notesService.addNote(this.projectAreaId, comment).subscribe({
        next: (note) => {
          this.notes.unshift(note);
          this.loadNotes();
        },
        error: (error) => {
          this.snackbar.open(
            `Error: Could not add note.`,
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
        },
        complete: () => {
          this.loadNotes();
          this.notesSidebarState = 'READY';
        },
      });
    }
  }

  handleNoteDelete(note: Note) {
    const dialogRef = this.dialog.open(DeleteNoteDialogComponent, {});
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.notesService.deleteNote(this.projectAreaId, note.id).subscribe({
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
                `Error: Could not delete note.`,
                'Dismiss',
                SNACK_ERROR_CONFIG
              );
            },
          });
        }
      });
  }

  loadNotes() {
    if (this.projectAreaId) {
      this.notesService.getNotes(this.projectAreaId).subscribe((notes) => {
        this.notes = notes;
      });
    }
  }
}
