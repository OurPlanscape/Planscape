import { Component } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DeleteNoteDialogComponent } from '../delete-note-dialog/delete-note-dialog.component';
import { take } from 'rxjs';
import { PlanNotesService } from '@services/plan-notes.service';

interface Note {
  id: number;
  message: string;
  name: string;
  date: string;
}

@Component({
  selector: 'app-area-notes',
  templateUrl: './area-notes.component.html',
  styleUrls: ['./area-notes.component.scss'],
})
export class AreaNotesComponent {
  constructor(private dialog: MatDialog) {}
  notes: Note[] = [
    {
      id: 1,
      message: 'Insert a note ',
      name: 'Otto Doe',
      date: 'Jan 18, 2024',
    },
    {
      id: 2,
      message: 'Insert a note ',
      name: 'Mika Doe',
      date: 'Jan 18, 2024',
    },
    {
      id: 3,
      message: 'Insert a note ',
      name: 'Ashley Doe',
      date: 'Jan 18, 2024',
    },
    {
      id: 4,
      message: 'Insert a note ',
      name: 'John Doe',
      date: 'Jan 18, 2024',
    },
    {
      id: 5,
      message: 'Insert a note ',
      name: 'Ribby Doe',
      date: 'Jan 18, 2024',
    },
  ];

  note = '';

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
      const note = {
        id: 1,
        name: 'your name',
        date: new Date().toDateString(),
        message: this.note,
      };
      // simulate saving
      setTimeout(() => {
        this.notes.unshift(note);
        this.note = '';
        this.saving = false;
      }, 1000);
    }
    event.preventDefault();
  }

  canDelete(note: Note) {
    // TODO check current logged in user
    return true;
  }
}
