import { NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { canAddScenario } from '@app/plan/permissions';
import { Note } from '@app/services';
import { PlanNotesService } from '@app/services/plan-notes.service';
import {
  NOTE_DELETE_DIALOG,
  SNACK_ERROR_CONFIG,
  SNACK_NOTICE_CONFIG,
} from '@app/shared';
import { DeleteDialogComponent } from '@app/standalone/delete-dialog/delete-dialog.component';
import { Plan } from '@app/types';
import {
  ExpandedPanelComponent,
  ModalComponent,
  NotesSidebarState,
} from '@styleguide';
import { NotesSidebarComponent } from '@styleguide';
import { take } from 'rxjs';

@Component({
  selector: 'app-notes-expanded-panel',
  standalone: true,
  imports: [
    ExpandedPanelComponent,
    ModalComponent,
    NgIf,
    NotesSidebarComponent,
  ],
  templateUrl: './notes-expanded-panel.component.html',
  styleUrl: './notes-expanded-panel.component.scss',
})
export class NotesExpandedPanelComponent {
  notes: Note[] = [];
  notesSidebarState: NotesSidebarState = 'READY';
  plan!: Plan;

  constructor(
    public dialogRef: MatDialogRef<NotesExpandedPanelComponent>,
    private notesService: PlanNotesService,
    private snackbar: MatSnackBar,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      plan: Plan;
    }
  ) {
    this.plan = this.data.plan;
    this.loadNotes();
  }

  hasPermission(plan: any) {
    return canAddScenario(plan);
  }

  close() {
    this.dialogRef.close();
  }

  //notes handling functions
  addNote(comment: string) {
    this.notesSidebarState = 'SAVING';
    this.notesService.addNote(this.plan.id, comment).subscribe({
      next: () => {
        this.loadNotes();
      },
      error: () => {
        this.snackbar.open(
          `Error: Could not add note.`,
          'Dismiss',
          SNACK_ERROR_CONFIG
        );
      },
      complete: () => {
        this.notesSidebarState = 'READY';
      },
    });
  }

  handleNoteDelete(note: Note) {
    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      data: NOTE_DELETE_DIALOG,
    });
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.notesService.deleteNote(this.plan.id, note.id).subscribe({
            next: () => {
              this.snackbar.open(
                `Deleted note`,
                'Dismiss',
                SNACK_NOTICE_CONFIG
              );
            },
            error: () => {
              this.snackbar.open(
                `Error: Could not delete note.`,
                'Dismiss',
                SNACK_ERROR_CONFIG
              );
            },
            complete: () => {
              this.loadNotes();
            },
          });
        }
      });
  }

  // TODO - handle unsub, set this to observable
  loadNotes() {
    if (this.plan.id) {
      this.notesService.getNotes(this.plan.id).subscribe((notes: Note[]) => {
        this.notes = notes;
      });
    }
  }
}
