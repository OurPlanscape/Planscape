import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, interval, switchMap, take } from 'rxjs';
import { Plan } from '@types';
import { Note, PlanningAreaNotesService } from '@services';
import { NotesSidebarState } from '@styleguide';
import {
  NOTE_DELETE_DIALOG,
  SNACK_ERROR_CONFIG,
  SNACK_NOTICE_CONFIG,
} from '@shared';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { PlanState } from './plan.state';
import { canAddScenario } from './permissions';
import {
  planningAreaMetricsAreReady,
  planningAreaMetricsFailed,
  POLLING_INTERVAL,
} from './plan-helpers';
import { DeleteDialogComponent } from '../standalone/delete-dialog/delete-dialog.component';
import { SuccessDialogComponent } from '../../styleguide/dialogs/success-dialog/success-dialog.component';

@UntilDestroy()
@Component({
  selector: 'app-plan',
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.scss'],
  providers: [PlanningAreaNotesService],
})
export class PlanComponent implements OnInit {
  planId = this.route.snapshot.paramMap.get('planId');
  planNotFound: boolean = !this.planId;
  sidebarNotes: Note[] = [];
  notesSidebarState: NotesSidebarState = 'READY';
  currentPlan$ = this.planState.currentPlan$;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private notesService: PlanningAreaNotesService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private breadcrumbService: BreadcrumbService,
    private planState: PlanState
  ) {
    if (this.planId === null) {
      this.planNotFound = true;
      return;
    }
    this.currentPlan$.pipe(untilDestroyed(this)).subscribe({
      next: (plan) => {
        // Setting up breadcrumbs
        this.breadcrumbService.updateBreadCrumb({
          label: 'Planning Area: ' + plan.name,
          backUrl: '/home',
        });
      },
      error: () => {
        this.planNotFound = true;
      },
    });

    this.checkForInProgressModal();
  }

  ngOnInit() {
    this.loadNotes();
    this.pollForChanges();
  }

  backToOverview() {
    this.router.navigate(['plan', this.planId]);
  }

  //notes handling functions
  addNote(comment: string) {
    this.notesSidebarState = 'SAVING';
    if (this.planId) {
      this.notesService.addNote(this.planId, comment).subscribe({
        next: () => {
          this.loadNotes();
        },
        error: () => {
          this.snackbar.open(
            `Error: could not add note.`,
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

  handleNoteDelete(n: Note) {
    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      data: NOTE_DELETE_DIALOG,
    });
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed: boolean) => {
        if (confirmed && this.planId) {
          this.notesService.deleteNote(this.planId, n.id).subscribe({
            next: () => {
              this.snackbar.open(
                `Deleted note`,
                'Dismiss',
                SNACK_NOTICE_CONFIG
              );
              this.loadNotes();
            },
            error: () => {
              this.snackbar.open(
                `Error: Could not delete note.`,
                'Dismiss',
                SNACK_ERROR_CONFIG
              );
            },
          });
        }
      });
  }

  loadNotes() {
    if (this.planId) {
      this.notesService.getNotes(this.planId).subscribe((notes: Note[]) => {
        this.sidebarNotes = notes;
      });
    }
  }

  canAddScenario(plan: Plan) {
    return canAddScenario(plan) || false;
  }

  // only poll if plan.map-status is not done
  private pollForChanges() {
    this.currentPlan$
      .pipe(
        // poll only while NOT DONE
        switchMap((plan) =>
          !this.isPlanMapStatusReady(plan) ? interval(POLLING_INTERVAL) : EMPTY
        ),
        untilDestroyed(this)
      )
      .subscribe(() => this.planState.reloadPlan());
  }

  private isPlanMapStatusReady(plan: Plan) {
    return planningAreaMetricsAreReady(plan) || planningAreaMetricsFailed(plan);
  }

  private checkForInProgressModal() {
    const nav = this.router.getCurrentNavigation();
    let flag = nav?.extras.state?.['showInProgressModal'];

    if (flag) {
      this.showInProgressModal();
      // Clear so it won't persist on refresh/back
      const { showInProgressModal, ...rest } = history.state ?? {};
      history.replaceState(rest, document.title);
    }
  }

  private showInProgressModal() {
    this.dialog.open(SuccessDialogComponent, {
      data: {
        headline: 'Your Scenario Analysis is in Progress',
        message:
          'You’ll be notified when it’s ready, the completed scenario can be viewed in planning area dashboard.',
      },
    });
  }
}
