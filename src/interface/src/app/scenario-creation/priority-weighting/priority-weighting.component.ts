import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  BannerComponent,
  ButtonComponent,
  InputDirective,
  InputFieldComponent,
  ModalComponent,
} from '@styleguide';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgForOf } from '@angular/common';

interface WeightedItem {
  id: number;
  name: string;
  value: number;
}

export interface AppliedWeight {
  id: number;
  value: number;
}

type WeightFormGroup = FormGroup<{
  id: FormControl<number>;
  name: FormControl<string>;
  value: FormControl<number>;
}>;

const MIN_WEIGHT = 1;
const MAX_WEIGHT = 100;

@Component({
  selector: 'app-priority-weighting',
  standalone: true,
  imports: [
    BannerComponent,
    ButtonComponent,
    ModalComponent,
    ReactiveFormsModule,
    NgForOf,
    InputDirective,
    InputFieldComponent,
  ],
  templateUrl: './priority-weighting.component.html',
  styleUrl: './priority-weighting.component.scss',
})
export class PriorityWeightingComponent<T extends WeightedItem>
  implements OnChanges
{
  @Input() items: T[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() applied = new EventEmitter<AppliedWeight[]>();

  weightForm = new FormGroup({
    weights: new FormArray<WeightFormGroup>([]),
  });

  get weights(): FormArray<WeightFormGroup> {
    return this.weightForm.controls.weights;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['items']) {
      this.buildWeights();
    }
  }

  private buildWeights() {
    this.weights.clear();
    this.items.forEach((item) => {
      this.weights.push(
        new FormGroup({
          id: new FormControl(item.id, { nonNullable: true }),
          name: new FormControl(item.name, { nonNullable: true }),
          value: new FormControl(item.value, {
            nonNullable: true,
            validators: [
              Validators.required,
              Validators.min(MIN_WEIGHT),
              Validators.max(MAX_WEIGHT),
            ],
          }),
        })
      );
    });
  }

  onWeightInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const sanitized = input.value.replace(/\D/g, '');
    if (sanitized !== input.value) {
      input.value = sanitized;
    }
    const parsed = sanitized === '' ? null : Number(sanitized);
    this.weights.at(index).controls.value.setValue(parsed as number);
  }

  increment(index: number) {
    const ctrl = this.weights.at(index).controls.value;
    const next = Math.min((ctrl.value ?? MIN_WEIGHT) + 1, MAX_WEIGHT);
    ctrl.setValue(next);
    ctrl.markAsDirty();
  }

  decrement(index: number) {
    const ctrl = this.weights.at(index).controls.value;
    const next = Math.max((ctrl.value ?? MIN_WEIGHT) - 1, MIN_WEIGHT);
    ctrl.setValue(next);
    ctrl.markAsDirty();
  }

  cancel() {
    this.closed.emit();
  }
  apply() {
    if (this.weightForm.invalid) {
      return;
    }
    const updates: AppliedWeight[] = this.weights.controls.map((g) => ({
      id: g.controls.id.value,
      value: g.controls.value.value,
    }));
    this.applied.emit(updates);
    this.closed.emit();
  }
  clickSecondary() {
    this.weights.controls.forEach((group) => {
      const ctrl = group.controls.value;
      ctrl.setValue(MIN_WEIGHT);
      ctrl.markAsDirty();
    });
  }
}
