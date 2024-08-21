import { Component, Input, OnInit } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { DeleteNoteDialogComponent } from '../delete-note-dialog/delete-note-dialog.component';
import { take } from 'rxjs';
import { Plan } from '@types';
import { AuthService, Note, PlanNotesService } from '@services';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';

@Component({
  selector: 'app-area-notes',
  templateUrl: './area-notes.component.html',
  styleUrls: ['./area-notes.component.scss'],
})
export class AreaNotesComponent implements OnInit {
  constructor(
    private planNotesService: PlanNotesService,
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
    this.planNotesService
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
          this.planNotesService.deleteNote(this.plan.id, note.id).subscribe({
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
      this.planNotesService
        .addNote(this.plan.id, this.note)
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
