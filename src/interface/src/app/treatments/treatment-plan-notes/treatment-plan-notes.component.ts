import { Component, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { NotesSidebarComponent, NotesSidebarState } from '@styleguide';
import {
  NOTE_DELETE_DIALOG,
  SNACK_ERROR_CONFIG,
  SNACK_NOTICE_CONFIG,
} from '@shared';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Note, TreatmentPlanNotesService } from '../../services/notes.service';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, distinctUntilChanged, take } from 'rxjs';
import { TreatmentsState } from '../treatments.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DeleteDialogComponent } from '../../standalone/delete-dialog/delete-dialog.component';

@UntilDestroy()
@Component({
  selector: 'app-treatment-plan-notes',
  standalone: true,
  imports: [AsyncPipe, MatTabsModule, NotesSidebarComponent],
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

  // notes data
  treatmentPlan$ = this.treatmentsState.treatmentPlan$;
  notes$ = new BehaviorSubject<Note[]>([]);
  notesSidebarState: NotesSidebarState = 'READY';

  ngOnInit(): void {
    this.treatmentPlan$
      .pipe(untilDestroyed(this), distinctUntilChanged())
      .subscribe(() => {
        this.loadNotes();
      });
  }

  //notes handling functions
  addNote(comment: string) {
    this.notesSidebarState = 'SAVING';
    this.notesService
      .addNote(this.treatmentsState.getTreatmentPlanId(), comment)
      .subscribe({
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
    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      data: NOTE_DELETE_DIALOG,
    });
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
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
    this.notesService
      .getNotes(this.treatmentsState.getTreatmentPlanId())
      .subscribe((notes: Note[]) => {
        this.notes$.next(notes);
      });
  }
}
