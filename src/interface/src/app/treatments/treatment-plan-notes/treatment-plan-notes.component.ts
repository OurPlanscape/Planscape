import { Component, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { ProjectAreasTabComponent } from '../project-areas-tab/project-areas-tab.component';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { NotesSidebarComponent, NotesSidebarState } from '@styleguide';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Note, TreatmentPlanNotesService } from '../../services/notes.service';
import { MatDialog } from '@angular/material/dialog';
import { DeleteNoteDialogComponent } from '../../plan/delete-note-dialog/delete-note-dialog.component';
import { BehaviorSubject, take, distinctUntilChanged } from 'rxjs';
import { TreatmentsState } from '../treatments.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-treatment-plan-notes',
  standalone: true,
  imports: [
    AsyncPipe,
    MatTabsModule,
    NotesSidebarComponent,
    ProjectAreasTabComponent,
    MapBaseLayerComponent,
  ],
  providers: [TreatmentPlanNotesService],
  templateUrl: './treatment-plan-notes.component.html',
  styleUrl: './treatment-plan-notes.component.scss',
})
export class TreatmentPlanNotesComponent implements OnInit {
  constructor(
    private notesService: TreatmentPlanNotesService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private treatmentsState: TreatmentsState
  ) {}

  treatmentPlan$ = this.treatmentsState.treatmentPlan$;
  treatmentPlanId?: number;
  // notes data
  notesModel = 'project_area';
  notes$ = new BehaviorSubject<Note[]>([]);
  notesSidebarState: NotesSidebarState = 'READY';

  ngOnInit(): void {
    this.treatmentPlan$
      .pipe(untilDestroyed(this), distinctUntilChanged())
      .subscribe((treatmentPlan) => {
        this.treatmentPlanId = treatmentPlan?.id;
        this.loadNotes();
      });
  }

  //notes handling functions
  addNote(comment: string) {
    if (this.treatmentPlanId) {
      this.notesSidebarState = 'SAVING';
      this.notesService.addNote(this.treatmentPlanId, comment).subscribe({
        next: () => {
          this.loadNotes();
        },
        error: () => {
          this.snackbar.open(
            `Error: Could not add note.`,
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
        },
        complete: () => {
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
        if (confirmed && this.treatmentPlanId) {
          this.notesService
            .deleteNote(this.treatmentPlanId, note.id)
            .subscribe({
              next: () => {
                this.snackbar.open(
                  `Deleted note`,
                  'Dismiss',
                  SNACK_NOTICE_CONFIG
                );
              },
              error: () => {
                this.snackbar.open(
                  `Error: Could not delete note.`,
                  'Dismiss',
                  SNACK_ERROR_CONFIG
                );
              },
              complete: () => {
                this.loadNotes();
              },
            });
        }
      });
  }

  loadNotes() {
    if (this.treatmentPlanId) {
      this.notesService
        .getNotes(this.treatmentPlanId)
        .subscribe((notes: Note[]) => {
          this.notes$.next(notes);
        });
    }
  }
}
