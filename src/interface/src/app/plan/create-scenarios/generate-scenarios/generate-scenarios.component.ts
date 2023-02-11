import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';
import { MatSliderChange } from '@angular/material/slider';
import { filter } from 'rxjs/operators';
import { MapService } from 'src/app/services';

@Component({
  selector: 'app-generate-scenarios',
  templateUrl: './generate-scenarios.component.html',
  styleUrls: ['./generate-scenarios.component.scss'],
})
export class GenerateScenariosComponent implements OnInit {
  @Input() formGroup?: FormGroup;
  @Output() formBackEvent = new EventEmitter<void>();

  private priorityNameMap?: Map<string, string>;
  priorityWeightControls: {
    priority: string;
    control: AbstractControl;
  }[] = [];

  readonly text1: string = `
    Adjust the relative importance of each focus to see a different scenario. Saved scenarios
    will be visible to anyone that has access to the area's plan. You'll be able to compare all
    your saved scenarios in the Area Overview.
    `;

  constructor(private mapService: MapService) {
    this.mapService.conditionNameToDisplayNameMap$
      .pipe(filter((nameMap) => !!nameMap))
      .subscribe((nameMap) => {
        this.priorityNameMap = nameMap;
      });
  }

  ngOnInit(): void {
    this.formGroup?.get('priorityWeightsForm')?.valueChanges.subscribe((_) => {
      const controls = (this.formGroup?.get('priorityWeightsForm') as FormGroup)
        .controls;
      this.priorityWeightControls = Object.keys(controls).map((key) => {
        return {
          priority: key,
          control: controls[key],
        };
      });
    });
  }

  displayNameForPriority(priority: string): string | undefined {
    return this.priorityNameMap?.get(priority);
  }

  updateFormWithSliderValue(
    sliderEvent: MatSliderChange,
    control?: AbstractControl | null
  ): void {
    control?.setValue(sliderEvent.value);
    control?.markAsDirty();
  }
}
