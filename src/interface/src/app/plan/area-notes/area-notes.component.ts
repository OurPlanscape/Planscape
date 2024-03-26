import { Component, Input, OnInit } from '@angular/core';
// import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DeleteNoteDialogComponent } from '../delete-note-dialog/delete-note-dialog.component';
import { take } from 'rxjs';
import { Note, PlanNotesService } from '@services/plan-notes.service';

@Component({
  selector: 'app-area-notes',
  templateUrl: './area-notes.component.html',
  styleUrls: ['./area-notes.component.scss'],
})
export class AreaNotesComponent implements OnInit {
  constructor(private planNotesService: PlanNotesService) {}

  @Input() planId!: number;

  notes: Note[] = [];

  note = '';

  ngOnInit() {
    this.loadNotes();
  }

  loadNotes() {
    this.planNotesService
      .getNotes(this.planId)
      .subscribe((notes) => (this.notes = notes));
  }

  saving = false;

  openDeleteNoteDialog(note: Note) {
    const dialogRef = this.dialog.open(DeleteNoteDialogComponent, {});
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        console.log('what is confirmed?', confirmed);
        if (confirmed) {
          this.PlanNotesService.deleteNote(ids).subscribe({
            next: (deletedIds) => {
              this.snackbar.open(
                `Deleted scenario${deletedIds.length > 1 ? 's' : ''}`,
                'Dismiss',
                SNACK_NOTICE_CONFIG
              );
              this.fetchScenarios();
            },
            error: (err) => {
              this.snackbar.open(
                `Error: ${err}`,
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
        .addNote(this.planId, this.note)
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
    // TODO check current logged in user
    return true;
  }
}
