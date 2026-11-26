import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  RasterColorType,
  StyleJson,
  WorkspaceDataLayerStylePayload,
} from '@types';

export const MIN_STYLE_ENTRIES = 2;
// a single value can be colored on its own; ramps and intervals need two
export const MIN_VALUES_ENTRIES = 1;

export function minStyleEntries(mapType: RasterColorType): number {
  return mapType === 'VALUES' ? MIN_VALUES_ENTRIES : MIN_STYLE_ENTRIES;
}
export const MAX_STYLE_ENTRIES = 20;

export type StyleEntryForm = FormGroup<{
  value: FormControl<number | null>;
  color: FormControl<string>;
  label: FormControl<string>;
}>;

export type UploadStyleForm = FormGroup<{
  custom: FormControl<boolean>;
  map_type: FormControl<RasterColorType>;
  entries: FormArray<StyleEntryForm>;
}>;

export function createStyleEntry(
  value: number | null,
  color: string,
  label = ''
): StyleEntryForm {
  return new FormGroup({
    value: new FormControl<number | null>(value, Validators.required),
    color: new FormControl(color, {
      nonNullable: true,
      validators: [Validators.pattern(/^#[0-9a-fA-F]{6}$/)],
    }),
    label: new FormControl(label, {
      nonNullable: true,
      validators: [Validators.maxLength(64)],
    }),
  });
}

export function createStyleForm(): UploadStyleForm {
  return new FormGroup(
    {
      custom: new FormControl(false, { nonNullable: true }),
      map_type: new FormControl<RasterColorType>('RAMP', {
        nonNullable: true,
      }),
      entries: new FormArray<StyleEntryForm>([], entriesCountValidator),
    },
    { validators: entriesOrderValidator }
  );
}

/** Refills the form from a saved style, as untouched. */
export function fillStyleForm(
  form: UploadStyleForm,
  style: StyleJson,
  custom: boolean
) {
  fillEntries(form, style);
  form.patchValue({ custom, map_type: style.map_type });
  setCustomStyle(form, custom);
  form.markAsPristine();
}

/** Puts back `style`'s map type and breaks, as an edit. */
export function resetStyleForm(form: UploadStyleForm, style: StyleJson) {
  fillEntries(form, style);
  form.controls.map_type.setValue(style.map_type);
  form.markAsDirty();
}

function fillEntries(form: UploadStyleForm, style: StyleJson) {
  const entries = form.controls.entries;
  entries.clear({ emitEvent: false });
  for (const entry of style.entries) {
    entries.push(
      createStyleEntry(
        entry.value,
        entry.color ?? '#000000',
        // labels that just repeat the value ("8.17") show as empty
        Number(entry.label) === entry.value ? '' : (entry.label ?? '')
      ),
      { emitEvent: false }
    );
  }
}

/** The editor only applies while the custom style is on. */
export function setCustomStyle(form: UploadStyleForm, custom: boolean) {
  const options = { emitEvent: false };
  if (custom) {
    form.controls.map_type.enable(options);
    form.controls.entries.enable(options);
  } else {
    form.controls.map_type.disable(options);
    form.controls.entries.disable(options);
  }
  form.updateValueAndValidity();
}

export function stylePayload(
  form: UploadStyleForm
): WorkspaceDataLayerStylePayload {
  const { map_type, entries } = form.getRawValue();
  return {
    map_type,
    entries: entries.map((entry) => ({
      value: Number(entry.value),
      color: entry.color,
      label: entry.label.trim(),
    })),
  };
}

/** The draft as the map draws it, keeping the saved nodata handling. */
export function draftStyle(
  form: UploadStyleForm,
  noData: StyleJson['no_data']
): StyleJson {
  const payload = stylePayload(form);
  return {
    map_type: payload.map_type,
    no_data: noData,
    entries: payload.entries.map((entry) => ({
      value: entry.value,
      color: entry.color,
      opacity: 1,
      label: entry.label || String(entry.value),
    })),
  };
}

const entriesCountValidator: ValidatorFn = (control: AbstractControl) => {
  const count = (control as FormArray).length;
  if (count < MIN_VALUES_ENTRIES) {
    return { tooFewEntries: true };
  }
  if (count > MAX_STYLE_ENTRIES) {
    return { tooManyEntries: true };
  }
  return null;
};

const entriesOrderValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const form = control as UploadStyleForm;
  if (form.controls.entries.disabled) {
    return null;
  }
  if (
    form.controls.entries.length < minStyleEntries(form.controls.map_type.value)
  ) {
    return { tooFewEntries: true };
  }
  const values = form.controls.entries.controls
    .map((entry) => entry.controls.value.value)
    .filter((value): value is number => value !== null);
  if (form.controls.map_type.value === 'VALUES') {
    return new Set(values).size === values.length
      ? null
      : { duplicateValues: true };
  }
  return values.every((value, i) => i === 0 || values[i - 1] < value)
    ? null
    : { unorderedValues: true };
};
