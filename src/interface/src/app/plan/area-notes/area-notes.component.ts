import { Component } from '@angular/core';

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

  addNote() {
    const note = {
      name: 'your name',
      date: new Date().toDateString(),
      message: this.note,
    };
    this.notes.push(note);
    this.note = '';
  }
}
