import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { MatTabsModule } from '@angular/material/tabs';
import {
  NotesSidebarComponent,
  NotesSidebarState,
} from 'src/styleguide/notes-sidebar/notes-sidebar.component';
import { Note } from '@services';
import { ProjectAreaNotesService } from '@services';
import { DeleteNoteDialogComponent } from '../../plan/delete-note-dialog/delete-note-dialog.component';
import { take } from 'rxjs';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-treatment-layout',
  standalone: true,
  providers: [ProjectAreaNotesService],
  imports: [
    RouterOutlet,
    TreatmentMapComponent,
    MatTabsModule,
    NotesSidebarComponent,
    MatDialogModule,
  ],

  templateUrl: './treatment-layout.component.html',
  styleUrl: './treatment-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentLayoutComponent {
  constructor(
    private notesService: ProjectAreaNotesService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar
  ) {}

  // notes data
  projectId: number = 0;
  notes: Note[] = [];
  notesSidebarState: NotesSidebarState = 'READY';

  //notes handling functions
  addNote(comment: string) {
    const projId = this.projectId.toString();
    this.notesSidebarState = 'SAVING';
    this.notesService.addNote(projId, comment).subscribe((note) => {
      this.notes.unshift(note);
      this.loadNotes();
    });
    this.notesSidebarState = 'READY';
  }

  handleNoteDelete(n: Note) {
    const dialogRef = this.dialog.open(DeleteNoteDialogComponent, {});
    const projId = this.projectId.toString();
    const noteId = n.id.toString();
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.notesService.deleteNote(projId, noteId).subscribe({
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

  loadNotes() {
    const projId = this.projectId.toString();
    this.notesService.getNotes(projId).subscribe((notes) => {
      this.notes = notes;
    });
  }
}
