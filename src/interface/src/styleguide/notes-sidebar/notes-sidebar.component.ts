import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DeleteNoteDialogComponent } from '../../app/plan/delete-note-dialog/delete-note-dialog.component';
import { take } from 'rxjs';
import { Note, NotesModelName, BaseNotesService } from '@services';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
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
export class NotesSidebarComponent implements OnInit {
  constructor(
    private notesService: BaseNotesService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar
  ) {}
  @Input() showHeader = false;
  @Input() notes: Note[] = [];
  @Input() notesModel!: NotesModelName;
  @Input() objectId!: number;
  @Input() noNotesTitleText = 'No Notes Yet';
  @Input() noNotesDetailText =
    'Start adding notes to help your team learn more about this section.';

  @Output() handleNoteResponse = new EventEmitter<boolean>();
  note = '';

  ngOnInit() {
    this.loadNotes();
  }

  loadNotes() {
    this.notesService.getNotes(this.objectId).subscribe({
      next: (notes) => {
        this.notes = notes;
        this.handleNoteResponse.emit(true);
      },
      error: () => {
        this.handleNoteResponse.emit(false);
      },
    });
  }

  saving = false;

  // TODO: decouple the notesService from this component?

  openDeleteNoteDialog(note: Note) {
    const dialogRef = this.dialog.open(DeleteNoteDialogComponent, {});
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.notesService.deleteNote(this.objectId, note.id).subscribe({
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
      this.notesService.addNote(this.objectId, this.note).subscribe((note) => {
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

  hasNotes(): boolean {
    return this.notes.length > 0;
  }

  canDelete(note: Note) {
    return note.can_delete;
  }
}
