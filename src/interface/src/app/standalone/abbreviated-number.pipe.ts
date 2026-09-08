import { Pipe, PipeTransform } from '@angular/core';

/**
 * Whole numbers, with anything from a million up abbreviated to one decimal
 * (1,500,000 -> "1.5 Million").
 */
@Pipe({
  name: 'abbreviatedNumber',
  standalone: true,
})
export class AbbreviatedNumberPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '';
    }
    const rounded = Math.round(value);
    if (Math.abs(rounded) < 1_000_000) {
      return rounded.toLocaleString('en-US');
    }
    const millions = Math.round(rounded / 100_000) / 10;
    return `${millions.toLocaleString('en-US')} Million`;
  }
}
