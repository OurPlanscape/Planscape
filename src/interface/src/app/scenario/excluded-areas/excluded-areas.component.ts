import { Component } from '@angular/core';
import { SectionComponent } from 'src/styleguide/collapsible-panel/section.component';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ScenarioState } from 'src/app/maplibre-map/scenario.state';
import { tap } from 'rxjs';

@Component({
  selector: 'app-excluded-areas',
  standalone: true,
  imports: [CommonModule, MatCheckboxModule, SectionComponent, ReactiveFormsModule,
  ],
  templateUrl: './excluded-areas.component.html',
  styleUrl: './excluded-areas.component.scss'
})
export class ExcludedAreasComponent {

  constructor(
    private scenarioState: ScenarioState
  ) { }
  excludedAreas$ = this.scenarioState.excludedAreas$.pipe(
    tap((areas) => (this.excludedAreas = areas))
  );
  excludedAreas: { key: number; label: string; id: number }[] = [];


  excludedAreasForm: FormGroup = new FormGroup({
    // TODO: use types for this form
    selectedQuestion: new FormControl<string[] | null>(null, [
      Validators.required,
    ]),
  });
}
