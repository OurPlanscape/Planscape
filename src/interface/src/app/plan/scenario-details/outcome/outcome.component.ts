import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

import { Scenario, Plan } from 'src/app/types';

@Component({
  selector: 'app-outcome',
  templateUrl: './outcome.component.html',
  styleUrls: ['./outcome.component.scss']
})
export class OutcomeComponent implements OnInit {
  @Input() plan: Plan | null = null;
  @Input() scenario: Scenario | null = null;
  scenarioNotes: FormGroup;

  constructor(private fb : FormBuilder) {
    this.scenarioNotes = fb.group({
      notes: "",
    });
  }

  ngOnInit(): void {
  }

}
