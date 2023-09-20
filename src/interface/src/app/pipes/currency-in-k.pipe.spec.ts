import { CurrencyInKPipe } from './currency-in-k.pipe';
import { TestBed } from '@angular/core/testing';
import { CurrencyPipe } from '@angular/common';

describe('CurrencyInKPipe', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CurrencyPipe],
    });
  });

  it('create an instance', () => {
    const currency = TestBed.inject(CurrencyPipe);
    const pipe = new CurrencyInKPipe(currency);
    expect(pipe).toBeTruthy();
  });
});
