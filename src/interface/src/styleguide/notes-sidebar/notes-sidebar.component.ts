import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
// TODO: move this to styleguide also?
import { DeleteNoteDialogComponent } from '../../app/plan/delete-note-dialog/delete-note-dialog.component';
import { take } from 'rxjs';
import { User } from '@types';
import { AuthService, Note, NotesService, NotesModelName } from '@services';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  standalone: true,
  selector: 'sg-notes-sidebar',
  templateUrl: './notes-sidebar.component.html',
  styleUrls: ['./notes-sidebar.component.scss'],
  imports: [MatFormFieldModule],
})
export class NotesSidebarComponent implements OnInit {
  constructor(
    private notesService: NotesService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private authService: AuthService
  ) {}

  @Input() model: NotesModelName = 'planning_area';
  @Input() objectId!: number;
  @Input() objectOwnerId!: User | null;

  notes: Note[] = [];
  note = '';

  ngOnInit() {
    this.loadNotes();
  }

  loadNotes() {
    this.notesService
      .getNotes(this.model, this.objectId)
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
            .deleteNote(this.model, this.objectId, note.id)
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
        .addNote(this.model, this.objectId, this.note)
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
    // TODO: simplify permissions...
    return note.user_id === userId || this.objectOwnerId === userId;
  }
}
