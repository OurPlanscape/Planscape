import { Component, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { Note, ProjectAreaNotesService } from '../../services/notes.service';
import { MatDividerModule } from '@angular/material/divider';
import {
  NotesSidebarComponent,
  NotesSidebarState,
  TreatmentStandsProgressBarComponent,
} from '@styleguide';
import { TreatmentsService } from '@services/treatments.service';
import { TreatmentPlan } from '@types';
import { DeleteNoteDialogComponent } from '../../plan/delete-note-dialog/delete-note-dialog.component';
import { take, distinctUntilChanged, BehaviorSubject } from 'rxjs';
import { SharedModule, SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { ProjectAreaTreatmentsTabComponent } from '../treatments-tab/treatments-tab.component';
import { MapConfigState } from '../treatment-map/map-config.state';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatmentsState } from '../treatments.state';
import { getTreatedStandsTotal } from '../prescriptions';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-project-area',
  standalone: true,
  providers: [ProjectAreaNotesService],
  imports: [
    AsyncPipe,
    MapBaseLayerComponent,
    MatDialogModule,
    MatDividerModule,
    MatTabsModule,
    NgIf,
    NotesSidebarComponent,
    ProjectAreaTreatmentsTabComponent,
    SharedModule,
    TreatmentStandsProgressBarComponent,
  ],
  templateUrl: './treatment-project-area.component.html',
  styleUrl: './treatment-project-area.component.scss',
})
export class TreatmentProjectAreaComponent implements OnDestroy, OnInit {
  constructor(
    private mapConfigState: MapConfigState,
    private selectedStandsState: SelectedStandsState,
    private treatmentsState: TreatmentsState,
    private treatmentsService: TreatmentsService,
    private notesService: ProjectAreaNotesService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar
  ) {}

  opacity = this.mapConfigState.treatedStandsOpacity$;
  activeProjectArea$ = this.treatmentsState.activeProjectArea$;
  treatmentPlanId: number = this.treatmentsState.getTreatmentPlanId();
  projectAreaId?: number;
  treatmentPlan: TreatmentPlan | null = null;

  // notes data
  notesModel = 'project_area';
  notes = new BehaviorSubject<Note[]>([]);
  notesSidebarState: NotesSidebarState = 'READY';

  getTreatedStandsTotal = getTreatedStandsTotal;

  changeValue(num: number) {
    this.mapConfigState.setTreatedStandsOpacity(num);
  }

  ngOnDestroy(): void {
    this.selectedStandsState.clearStands();
    this.treatmentsState.setShowApplyTreatmentsDialog(false);
  }

  ngOnInit(): void {
    if (this.treatmentPlanId) {
      this.treatmentsService
        .getTreatmentPlan(Number(this.treatmentPlanId))
        .subscribe((r) => (this.treatmentPlan = r));
    }

    this.activeProjectArea$
      .pipe(distinctUntilChanged(), untilDestroyed(this))
      .subscribe((projectArea) => {
        this.projectAreaId = projectArea?.project_area_id;
        this.loadNotes();
      });
  }

  //notes handling functions
  addNote(comment: string) {
    if (this.projectAreaId) {
      this.notesSidebarState = 'SAVING';
      this.notesService.addNote(this.projectAreaId, comment).subscribe({
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
  }

  handleNoteDelete(note: Note) {
    const dialogRef = this.dialog.open(DeleteNoteDialogComponent, {});
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed && this.projectAreaId) {
          this.notesService.deleteNote(this.projectAreaId, note.id).subscribe({
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

  loadNotes() {
    if (this.projectAreaId) {
      this.notesService
        .getNotes(this.projectAreaId)
        .subscribe((notes: Note[]) => {
          this.notes.next([...notes]);
        });
    }
  }
}
