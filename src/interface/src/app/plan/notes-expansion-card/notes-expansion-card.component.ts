import { Component } from '@angular/core';
import { NotesExpandedPanelComponent } from '@app/notes-expanded-panel/notes-expanded-panel.component';
import { ButtonComponent } from '@styleguide';
import { MatDialog } from '@angular/material/dialog';
import { Plan } from '@app/types';
import { PlanNotesService } from '@app/services/plan-notes.service';
import { AsyncPipe, NgIf } from '@angular/common';
import { PlanState } from '../plan.state';

@Component({
  selector: 'app-notes-expansion-card',
  standalone: true,
  imports: [AsyncPipe, ButtonComponent, NgIf],
  templateUrl: './notes-expansion-card.component.html',
  styleUrl: './notes-expansion-card.component.scss',
})
export class NotesExpansionCardComponent {
  plan: Plan | null = null;

  notes$ = this.notesService.notes$;

  constructor(
    private dialog: MatDialog,
    private notesService: PlanNotesService,
    private planState: PlanState
  ) {
    //TODO: unsub, clean this up
    this.planState.currentPlan$.subscribe((plan) => {
      this.plan = plan;
      this.notesService.getNotes(plan.id).subscribe();
    });
  }

  openNotesPanel() {
    if (this.plan) {
      this.dialog.open(NotesExpandedPanelComponent, {
        data: { plan: this.plan },
      });
    }
  }
}
