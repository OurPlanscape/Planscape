import { CurrencyInKPipe } from './currency-in-k.pipe';
import { TestBed } from '@angular/core/testing';
import { CurrencyPipe } from '@angular/common';

describe('CurrencyInKPipe', () => {
  let currencyPipe: CurrencyPipe;
  let pipe: CurrencyInKPipe;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CurrencyPipe],
    });
    currencyPipe = TestBed.inject(CurrencyPipe);
    pipe = new CurrencyInKPipe(currencyPipe);
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format numbers in K (thousands) and as currency', () => {
    expect(pipe.transform(1000)).toEqual('$1K');
    expect(pipe.transform(22000)).toEqual('$22K');
    expect(pipe.transform(122000)).toEqual('$122K');
    expect(pipe.transform(1220000)).toEqual('$1,220K');
  });

  it('should round numbers up to 2 decimals (in K)', () => {
    expect(pipe.transform(1200)).toEqual('$1.2K');
    expect(pipe.transform(1234)).toEqual('$1.23K');
    expect(pipe.transform(1293)).toEqual('$1.29K');
    expect(pipe.transform(1298)).toEqual('$1.3K');
    expect(pipe.transform(250)).toEqual('$0.25K');
    expect(pipe.transform(58)).toEqual('$0.06K');
  });

  it('should display $0 if value is zero', () => {
    expect(pipe.transform(0)).toEqual('$0');
  });
});
