import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

@Pipe({
  name: 'currencyInK',
})
export class CurrencyInKPipe implements PipeTransform {
  constructor(public currencyPipe: CurrencyPipe) {}

  transform(value: number): string | null {
    if (value === 0) {
      return '$0';
    }
    return (
      this.currencyPipe.transform(
        Math.round(value / 1000),
        'USD',
        'symbol',
        '1.0'
      ) + 'K'
    );
  }
}
