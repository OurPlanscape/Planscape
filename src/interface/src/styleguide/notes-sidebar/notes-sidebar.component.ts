import {
  Component,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
  OnChanges,
} from '@angular/core';
import { Note } from '@services';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';

@Component({
  standalone: true,
  selector: 'sg-notes-sidebar',
  templateUrl: './notes-sidebar.component.html',
  styleUrls: ['./notes-sidebar.component.scss'],
  imports: [
    MatMenuModule,
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    FormsModule,
    MatInputModule,
  ],
})
export class NotesSidebarComponent implements OnChanges {
  constructor() {}
  @Input() showHeader = false;
  @Input() notes: Note[] = [];
  @Input() noNotesTitleText = 'No Notes Yet';
  @Input() noNotesDetailText =
    'Start adding notes to help your team learn more about this section.';

  @Output() handleNoteResponse = new EventEmitter<boolean>();
  @Output() createNote = new EventEmitter<string>();
  @Output() deleteNote = new EventEmitter<Note>();

  newNoteText = '';
  saving = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['notes']) {
      this.saving = false;
    }
  }

  requestToDelete(note: Note) {
    this.deleteNote.emit(note);
  }

  addNote(event: Event) {
    if (this.newNoteText) {
      event.preventDefault();
      this.createNote.emit(this.newNoteText);

      // TODO: add a callback or equivalent to handle this UI state?
      this.saving = true;
      this.newNoteText = '';
    }
  }

  hasNotes(): boolean {
    return this.notes.length > 0;
  }

  canDelete(note: Note) {
    return note.can_delete;
  }
}
