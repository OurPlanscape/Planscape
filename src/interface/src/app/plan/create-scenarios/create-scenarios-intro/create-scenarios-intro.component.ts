import { FormGroup } from '@angular/forms';
import { Legend, colormapConfigToLegend } from 'src/app/types';
import { take } from 'rxjs';
import { MapService } from './../../../services/map.service';
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-create-scenarios-intro',
  templateUrl: './create-scenarios-intro.component.html',
  styleUrls: ['./create-scenarios-intro.component.scss'],
})
export class CreateScenariosIntroComponent implements OnInit {
  @Input() formGroup: FormGroup | undefined;
  @Output() formCompleteEvent = new EventEmitter<void>();

  readonly text1: string = `
  You can choose to use either the Current Condition scores or Management Opportunity scores
  to inform the identification and prioritization of project areas for treatment. Priorities
  are based on the Pillars of Resilience Framework.
  `;

  readonly text3: string = `
    Uses the current condition of the defined planning area. Future modeling is not considered.
  `;

  readonly text4: string = `
    Uses both current and future conditions of the defined planning area.
  `;

  legend: Legend | undefined;

  constructor(private mapService: MapService) {}

  ngOnInit(): void {
    this.mapService
      .getColormap('turbo')
      .pipe(take(1))
      .subscribe((colormapConfig) => {
        this.legend = colormapConfigToLegend(colormapConfig);
      });

    this.formGroup?.statusChanges.subscribe(status => {
      if (status === 'VALID') {
        this.formCompleteEvent.emit();
      }
    });
  }
}
