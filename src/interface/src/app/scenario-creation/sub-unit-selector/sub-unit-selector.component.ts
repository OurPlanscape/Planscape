import { Component } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  ReactiveFormsModule,
  FormControl,
  Validators,
} from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { StepDirective } from '../../../styleguide/steps/step.component';
import { SelectableListComponent } from '../../../styleguide/selectable-list/selectable-list.component';
import { BaseLayersStateService } from '../../base-layers/base-layers.state.service';
import { Observable, of } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { ScenarioDraftConfiguration } from '@app/types';

// TODO: move this to a central place
interface SubUnitOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-sub-unit-selector',
  templateUrl: './sub-unit-selector.component.html',
  styleUrl: './sub-unit-selector.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    ReactiveFormsModule,
    SectionComponent,
    SelectableListComponent,
  ],
  providers: [
    { provide: StepDirective, useExisting: SubUnitSelectorComponent },
  ],
})
export class SubUnitSelectorComponent extends  StepDirective<ScenarioDraftConfiguration>
 {
  constructor(private baseLayersStateService: BaseLayersStateService) {
    baseLayersStateService.enableBaseLayerHover(false);
    super();
  }

  form = new FormGroup({
    subunit: new FormControl<number | undefined>(undefined, [
      Validators.required,
    ]),
  });

  //TODO...these are placeholders
  subUnitOptions$: Observable<SubUnitOption[]> = of([
    { id: 0, name: 'test-Subwatersheds (HUC-12)' },
    { id: 1, name: 'test-PODs' },
    { id: 2, name: 'test-Subfiresheds' },
  ]);

  loadingItems$ = this.baseLayersStateService.loadingLayers$;

  getData() {
    return this.form.value;
  }

  override beforeStepLoad(): void {
    //
  }

  override beforeStepExit(): void {}
}
