import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { Note } from '@services';
import { ProjectAreaNotesService } from '@services';
import { PrescriptionActionsComponent } from '../prescription-actions/prescription-actions.component';
import { MatDividerModule } from '@angular/material/divider';
import {
  NotesSidebarComponent,
  NotesSidebarState,
} from 'src/styleguide/notes-sidebar/notes-sidebar.component';
import { MatTabsModule } from '@angular/material/tabs';
import { SharedModule } from '@shared';
import { TreatmentsService } from '@services/treatments.service';
import { TreatmentPlan } from '@types';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentSummaryComponent } from '../treatment-summary/treatment-summary.component';
import { DeleteNoteDialogComponent } from '../../plan/delete-note-dialog/delete-note-dialog.component';
import { take } from 'rxjs';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-project-area',
  standalone: true,
  providers: [ProjectAreaNotesService],
  imports: [
    SharedModule,
    TreatmentMapComponent,
    TreatmentSummaryComponent,
    JsonPipe,
    AsyncPipe,
    PrescriptionActionsComponent,
    MatDividerModule,
    NotesSidebarComponent,
    MatTabsModule,
    MatDialogModule,
  ],
  templateUrl: './treatment-project-area.component.html',
  styleUrl: './treatment-project-area.component.scss',
  // providers: [{ provide: PlanNotesService, useClass: PlanNotesService }],
})
export class TreatmentProjectAreaComponent implements OnInit {
  treatmentPlanId: number = this.route.snapshot.data['treatmentId'];
  projectAreaId: number = this.route.snapshot.data['projectAreaId'];

  treatmentPlan: TreatmentPlan | null = null;
  notesModel = 'project_area';

  constructor(
    private treatmentsService: TreatmentsService,
    private route: ActivatedRoute,
    private notesService: ProjectAreaNotesService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar
  ) {}
  ngOnInit(): void {
    if (this.treatmentPlanId) {
      this.treatmentsService
        .getTreatmentPlan(Number(this.treatmentPlanId))
        .subscribe((r) => (this.treatmentPlan = r));
    }
  }

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
