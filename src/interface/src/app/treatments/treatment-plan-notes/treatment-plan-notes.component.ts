import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { NotesSidebarComponent, NotesSidebarState } from '@styleguide';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Note, TreatmentPlanNotesService } from '../../services/notes.service';
import { MatDialog } from '@angular/material/dialog';
import { DeleteNoteDialogComponent } from '../../plan/delete-note-dialog/delete-note-dialog.component';
import { take } from 'rxjs';
import { TreatmentsState } from '../treatments.state';
import { UntilDestroy } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-treatment-plan-notes',
  standalone: true,
  imports: [AsyncPipe, MatTabsModule, NotesSidebarComponent],
  providers: [TreatmentPlanNotesService],
  templateUrl: './treatment-plan-notes.component.html',
  styleUrl: './treatment-plan-notes.component.scss',
})
export class TreatmentPlanNotesComponent {
  constructor(
    private notesService: TreatmentPlanNotesService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private treatmentsState: TreatmentsState
  ) {}
  // notes data
  notes$ = this.notesService.getNotes(
    this.treatmentsState.getTreatmentPlanId()
  );
  notesSidebarState: NotesSidebarState = 'READY';

  //notes handling functions
  addNote(comment: string) {
    const treatmentPlanId = this.treatmentsState.getTreatmentPlanId();
    this.notesSidebarState = 'SAVING';
    this.notesService.addNote(treatmentPlanId, comment).subscribe({
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

  handleNoteDelete(note: Note) {
    const dialogRef = this.dialog.open(DeleteNoteDialogComponent, {});
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed && this.treatmentsState.getTreatmentPlanId()) {
          this.notesService
            .deleteNote(this.treatmentsState.getTreatmentPlanId(), note.id)
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
    this.notes$ = this.notesService.getNotes(
      this.treatmentsState.getTreatmentPlanId()
    );
  }
}
