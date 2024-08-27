import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DeleteNoteDialogComponent } from '../delete-note-dialog/delete-note-dialog.component';
import { take } from 'rxjs';
import { Plan } from '@types';
import { AuthService, Note, NotesService } from '@services';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';

const NOTES_MODEL = 'planning_area';

@Component({
  selector: 'app-area-scrolling-notes',
  templateUrl: './area-scrolling-notes.component.html',
  styleUrls: ['./area-scrolling-notes.component.scss'],
})
export class AreaScrollingNotesComponent implements OnInit {
  constructor(
    private notesService: NotesService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private authService: AuthService
  ) {}

  @Input() plan!: Plan;
  notes: Note[] = [];
  note = '';

  ngOnInit() {
    this.loadNotes();
  }

  loadNotes() {
    this.notesService
      .getNotes(NOTES_MODEL, this.plan?.id)
      .subscribe((notes) => (this.notes = notes));
  }

  saving = false;

  openDeleteNoteDialog(note: Note) {
    const dialogRef = this.dialog.open(DeleteNoteDialogComponent, {});
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.notesService
            .deleteNote(NOTES_MODEL, this.plan.id, note.id)
            .subscribe({
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
      this.notesService
        .addNote(NOTES_MODEL, this.plan.id, this.note)
        .subscribe((note) => {
          // add the note
          this.notes.unshift(note);
          // but then refresh as well.
          this.loadNotes();
          this.saving = false;
          this.note = '';
        });
    }
    event.preventDefault();
  }

  canDelete(note: Note) {
    const userId = this.authService.loggedInUser$.value?.id;
    return note.user_id === userId || this.plan.user === userId;
  }
}
