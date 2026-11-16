import { Component, Input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonComponent, ToggleComponent } from '@styleguide';
import { RasterColorType } from '@types';
import {
  createStyleEntry,
  MAX_STYLE_ENTRIES,
  MIN_STYLE_ENTRIES,
  UploadStyleForm,
} from './upload-style-form';
import {
  evenBreaks,
  paletteColors,
  STYLE_PALETTES,
  StylePalette,
} from './upload-style-palettes';

const MAP_TYPES: { value: RasterColorType; label: string }[] = [
  { value: 'RAMP', label: 'Ramp (smooth gradient)' },
  { value: 'INTERVALS', label: 'Intervals (color per range)' },
  { value: 'VALUES', label: 'Values (color per exact value)' },
];

@Component({
  selector: 'app-upload-style-editor',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    ReactiveFormsModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
    ButtonComponent,
    ToggleComponent,
  ],
  templateUrl: './upload-style-editor.component.html',
  styleUrl: './upload-style-editor.component.scss',
})
export class UploadStyleEditorComponent {
  @Input({ required: true }) form!: UploadStyleForm;
  /** The raster's value range, for even breaks. */
  @Input() range: { min: number; max: number } | null = null;

  readonly mapTypes = MAP_TYPES;
  readonly palettes = STYLE_PALETTES;
  readonly maxEntries = MAX_STYLE_ENTRIES;
  readonly minEntries = MIN_STYLE_ENTRIES;

  get custom() {
    return this.form.controls.custom.value;
  }

  get entries() {
    return this.form.controls.entries;
  }

  get orderError(): string | null {
    if (this.form.hasError('unorderedValues')) {
      return 'Values must go from lowest to highest.';
    }
    if (this.form.hasError('duplicateValues')) {
      return 'Each value can only appear once.';
    }
    return null;
  }

  paletteGradient(palette: StylePalette) {
    return `linear-gradient(to right, ${palette.colors.join(', ')})`;
  }

  applyPalette(palette: StylePalette) {
    const colors = paletteColors(palette, this.entries.length);
    this.entries.controls.forEach((entry, i) =>
      entry.controls.color.setValue(colors[i])
    );
    this.entries.markAsDirty();
  }

  applyEvenBreaks() {
    if (!this.range) {
      return;
    }
    const values = evenBreaks(
      this.range.min,
      this.range.max,
      this.entries.length
    );
    this.entries.controls.forEach((entry, i) =>
      entry.controls.value.setValue(values[i])
    );
    this.entries.markAsDirty();
  }

  addEntry() {
    if (this.entries.length >= this.maxEntries) {
      return;
    }
    const values = this.entries.controls.map((e) => e.controls.value.value);
    const last = values[values.length - 1] ?? 0;
    const previous = values[values.length - 2] ?? last - 1;
    const step = last - previous || 1;
    const lastColor =
      this.entries.at(this.entries.length - 1)?.controls.color.value ??
      '#000000';
    this.entries.push(createStyleEntry(last + step, lastColor));
    this.entries.markAsDirty();
  }

  removeEntry(index: number) {
    if (this.entries.length <= this.minEntries) {
      return;
    }
    this.entries.removeAt(index);
    this.entries.markAsDirty();
  }
}
