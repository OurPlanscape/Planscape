import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

import { Scenario, Plan } from 'src/app/types';

@Component({
  selector: 'app-outcome',
  templateUrl: './outcome.component.html',
  styleUrls: ['./outcome.component.scss'],
})
export class OutcomeComponent {
  @Input() plan: Plan | null = null;
  @Input() scenario: Scenario | null = null;
  scenarioNotes: FormGroup;

  // TODO: Use real priorities from the backend.
  priorities: {
    name: string;
    value: number;
  }[] = [
    {
      name: 'Fire Dynamics',
      value: 3,
    },
  ];

  constructor(private fb: FormBuilder) {
    // TODO: Call update scenario on submit.
    this.scenarioNotes = fb.group({
      notes: '',
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.scenario) {
      if (
        changes['scenario'].previousValue?.['notes'] !==
        changes['scenario'].currentValue?.['notes']
      ) {
        this.scenarioNotes.controls['notes'].setValue(this.scenario.notes);
      }
    }
  }
}
