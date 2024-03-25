import { Component } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DeleteNoteDialogComponent } from '../delete-note-dialog/delete-note-dialog.component';

interface Note {
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
      message: 'Insert a note ',
      name: 'Otto Doe',
      date: 'Jan 18, 2024',
    },
    {
      message: 'Insert a note ',
      name: 'Mika Doe',
      date: 'Jan 18, 2024',
    },
    {
      message: 'Insert a note ',
      name: 'Ashley Doe',
      date: 'Jan 18, 2024',
    },
    {
      message: 'Insert a note ',
      name: 'John Doe',
      date: 'Jan 18, 2024',
    },
    {
      message: 'Insert a note ',
      name: 'Ribby Doe',
      date: 'Jan 18, 2024',
    },
  ];

  note = '';

  saving = false;

  openDeleteNoteDialog() {
    this.dialog.open(DeleteNoteDialogComponent, {}).afterClosed();
  }

  addNote(event: Event) {
    if (this.note) {
      this.saving = true;
      const note = {
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
}
