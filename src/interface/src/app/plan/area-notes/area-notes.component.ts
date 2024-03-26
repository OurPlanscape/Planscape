import { Component, Input, OnInit } from '@angular/core';
import { Note, PlanNotesService } from '@services/plan-notes.service';

@Component({
  selector: 'app-area-notes',
  templateUrl: './area-notes.component.html',
  styleUrls: ['./area-notes.component.scss'],
})
export class AreaNotesComponent implements OnInit {
  constructor(private planNotesService: PlanNotesService) {}

  @Input() planId!: number;

  notes: Note[] = [];

  note = '';

  ngOnInit() {
    this.loadNotes();
  }

  loadNotes() {
    this.planNotesService
      .getNotes(this.planId)
      .subscribe((notes) => (this.notes = notes));
  }

  saving = false;

  addNote(event: Event) {
    if (this.note) {
      this.saving = true;
      this.planNotesService
        .addNote(this.planId, this.note)
        .subscribe((note) => {
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
}
