import { Component, Input, OnInit } from '@angular/core';

import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { DeleteNoteDialogComponent } from '../delete-note-dialog/delete-note-dialog.component';
import { take } from 'rxjs';
import { Plan } from '@types';
import { AuthService, Note, PlanningAreaNotesService } from '@services';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-area-notes',
  templateUrl: './area-notes.component.html',
  styleUrls: ['./area-notes.component.scss'],
})
export class AreaNotesComponent implements OnInit {
  constructor(
    private notesService: PlanningAreaNotesService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private authService: AuthService
  ) {}

  @Input() plan!: Plan;
  notes: Note[] = [];
  note = '';
  saving = false;

  ngOnInit() {
    this.loadNotes();
  }

  loadNotes() {
    this.notesService
      .getNotes(this.plan?.id)
      .subscribe((notes) => (this.notes = notes));
  }

  openDeleteNoteDialog(note: Note) {
    const dialogRef = this.dialog.open(DeleteNoteDialogComponent, {});
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.notesService.deleteNote(this.plan?.id, note.id).subscribe({
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

  addNote(event: Event) {
    if (this.note) {
      this.saving = true;
      this.notesService.addNote(this.plan?.id, this.note).subscribe({
        next: (noteResult: Note) => {
          // add the note to the shown list
          this.notes.unshift(noteResult);
          // but then refresh as well.
          this.loadNotes();
          this.saving = false;
          this.note = '';
        },
        error: (error: any) => {
          this.snackbar.open(
            `Error adding note.`,
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
          this.saving = false;
          this.note = '';
        },
      });
    }
    event.preventDefault();
  }

  canDelete(note: Note) {
    const userId = this.authService.loggedInUser$.value?.id;
    return note.user_id === userId || this.plan.user === userId;
  }
}
