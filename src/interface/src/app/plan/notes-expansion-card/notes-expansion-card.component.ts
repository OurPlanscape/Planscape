import { Component } from '@angular/core';
import { NotesExpandedPanelComponent } from '@app/notes-expanded-panel/notes-expanded-panel.component';
import { ButtonComponent } from '@styleguide';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-notes-expansion-card',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './notes-expansion-card.component.html',
  styleUrl: './notes-expansion-card.component.scss'
})
export class NotesExpansionCardComponent {
  notes = { count: 0 };

  constructor(private dialog: MatDialog,
  ) {

  }

  openNotesPanel() {
    console.log('great, now we open notes');
    this.dialog.open(NotesExpandedPanelComponent, {
    });
  }

}
