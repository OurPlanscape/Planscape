import {
  Component,
  Input,
  Output,
  HostBinding,
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

export type NotesSidebarState = 'SAVING' | 'READY';

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
  @Input() notesState: NotesSidebarState = 'READY';
  @Input() notes: Note[] = [];
  @Input() noNotesTitleText = 'No Notes Yet';
  @Input() noNotesDetailText =
    'Start adding notes to help your team learn more about this section.';

  @Output() createNote = new EventEmitter<string>();
  @Output() deleteNote = new EventEmitter<Note>();

  newNoteText = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['notes']) {
      this.notesState = 'READY';
    }
  }

  requestToDelete(note: Note) {
    this.deleteNote.emit(note);
  }

  addNote(event: Event) {
    if (this.newNoteText) {
      event.preventDefault();
      this.createNote.emit(this.newNoteText);
      this.newNoteText = '';
    }
  }

  hasNotes(): boolean {
    return this.notes.length > 0;
  }

  canDelete(note: Note) {
    return note.can_delete;
  }

  @HostBinding('class.saving') get isSaving() {
    return this.notesState === 'SAVING';
  }

  @HostBinding('class.ready') get isReady() {
    return this.notesState === 'READY';
  }
}
