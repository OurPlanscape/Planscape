import { Component, OnInit } from '@angular/core';
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

interface ExcludedArea {
  key: number;
  label: string;
  id: number;
}

@Component({
  selector: 'app-excluded-areas',
  standalone: true,
  imports: [
    CommonModule,
    MatCheckboxModule,
    SectionComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './excluded-areas.component.html',
  styleUrl: './excluded-areas.component.scss',
})
export class ExcludedAreasComponent implements OnInit {
  constructor(private scenarioState: ScenarioState) {}

  excludedAreas: ExcludedArea[] = [];

  excludedAreas$ = this.scenarioState.excludedAreas$.pipe(
    tap((areas) => (this.excludedAreas = areas))
  );

  form: FormGroup = new FormGroup({
    excludedAreas: new FormControl<string[] | null>(null, [
      Validators.required,
    ]),
  });

  ngOnInit() {
    this.scenarioState.excludedAreas$.subscribe((areas) => {
      this.excludedAreas = areas;
      this.createForm();
    });
  }

  private createForm() {
    this.form = new FormGroup({
      excluded_areas: new FormControl([]),
    });
  }

  isChecked(key: number): boolean {
    const excludedAreas = this.form.get('excluded_areas')?.value || [];
    return excludedAreas.includes(key);
  }

  onCheckboxChange(key: number, event: any) {
    const excludedAreas = this.form.get('excluded_areas')?.value || [];

    if (event.checked) {
      this.form.get('excluded_areas')?.setValue([...excludedAreas, key]);
    } else {
      this.form
        .get('excluded_areas')
        ?.setValue(excludedAreas.filter((k: number) => k !== key));
    }
  }
}
