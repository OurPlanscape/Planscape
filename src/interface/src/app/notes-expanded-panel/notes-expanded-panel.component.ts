import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Plan } from '@app/types';
import { ExpandedPanelComponent, ModalComponent, NotesSidebarState } from '@styleguide';
import { NotesSidebarComponent } from '@styleguide';

@Component({
  selector: 'app-notes-expanded-panel',
  standalone: true,
  imports: [ExpandedPanelComponent, ModalComponent, NotesSidebarComponent],
  templateUrl: './notes-expanded-panel.component.html',
  styleUrl: './notes-expanded-panel.component.scss'
})
export class NotesExpandedPanelComponent {

  notes = [];
  notesSidebarState: NotesSidebarState = 'READY';
  plan!: Plan;

  constructor(public dialogRef: MatDialogRef<NotesExpandedPanelComponent>
  ) {

  }


  close() {
    this.dialogRef.close();
  }

  addNote(noteText: string) {
    console.log(noteText);
  }

  handleNoteDelete(e: any) {
    console.log(e);
  }

  // TODO: fix this
  canAddScenario(meh: any) {
    console.log(meh);
    return true;
  }


}
