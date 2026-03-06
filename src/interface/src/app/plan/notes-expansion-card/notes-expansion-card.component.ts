import { Component, Input } from '@angular/core';
import { NotesExpandedPanelComponent } from '@app/notes-expanded-panel/notes-expanded-panel.component';
import { ButtonComponent } from '@styleguide';
import { MatDialog } from '@angular/material/dialog';
import { Note } from '@app/services';
import { Plan } from '@app/types';

@Component({
  selector: 'app-notes-expansion-card',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './notes-expansion-card.component.html',
  styleUrl: './notes-expansion-card.component.scss'
})
export class NotesExpansionCardComponent {
  @Input() notes: Note[] = [];
  @Input() plan!: Plan | null;

  constructor(private dialog: MatDialog,
  ) {

  }

  openNotesPanel() {
    if (this.plan) {
      this.dialog.open(NotesExpandedPanelComponent, {
        data: { plan: this.plan }
      });
    }
  }

}
