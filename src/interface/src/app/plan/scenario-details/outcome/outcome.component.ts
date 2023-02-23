import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-outcome',
  templateUrl: './outcome.component.html',
  styleUrls: ['./outcome.component.scss']
})
export class OutcomeComponent implements OnInit {
  scenarioNotes: FormGroup;

  constructor(private fb : FormBuilder) {
    this.scenarioNotes = fb.group({
      notes: "",
    });
  }

  ngOnInit(): void {
  }

}
