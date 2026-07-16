import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { ProjectAreasComponent } from './project-areas.component';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { By } from '@angular/platform-browser';
import { LegacyMaterialModule } from '@material/legacy-material.module';

@Component({
  template:
    '<app-project-areas [areas]="areas" [showRxLeverage]="showRxLeverage"></app-project-areas>',
})
class TestHostComponent {
  showRxLeverage = false;
  areas = [
    {
      rank: 1,
      percentTreatableArea: 0.2234,
      score: 2,
      estimatedCost: 1231.22,
      acres: 120.23,
      rxLeverage: 3.5,
    },
  ];
}

describe('ProjectAreasComponent', () => {
  let component: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestHostComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      imports: [LegacyMaterialModule, ProjectAreasComponent],
      providers: [CurrencyPipe],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    component.areas = [
      {
        rank: 1,
        percentTreatableArea: 0.2234,
        score: 2.1223123123,
        estimatedCost: 1231.22,
        acres: 120.23,
        rxLeverage: 3.5,
      },
    ];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show `acres` as a number without decimals', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    const queryElement = fixture.debugElement.query(
      By.css('[data-id="acres"]')
    );
    expect(queryElement).toBeTruthy();
    if (queryElement) {
      expect(queryElement.nativeElement.innerHTML.trim()).toBe('120');
    }
  }));

  it('should display `percentTotal` with two decimal points and as percentage', fakeAsync(() => {
    tick();
    fixture.detectChanges();
    const queryElement = fixture.debugElement.query(
      By.css('[data-id="percentTotal"]')
    ).nativeElement;
    expect(queryElement.innerHTML.trim()).toBe('22.34%');
  }));

  it('should show `estimatedCost` in as currency with 2 decimals', fakeAsync(() => {
    tick();
    fixture.detectChanges();
    const queryElement = fixture.debugElement.query(
      By.css('[data-id="estimatedCost"]')
    ).nativeElement;
    expect(queryElement.innerHTML.trim()).toBe('$1,231');
  }));

  it('should calculate totals based on provided areas', fakeAsync(() => {
    tick();
    fixture.detectChanges();
    component.areas = [
      {
        rank: 1,
        percentTreatableArea: 0.2,
        score: 1,
        estimatedCost: 100,
        acres: 4,
        rxLeverage: 2,
      },
      {
        rank: 1,
        percentTreatableArea: 0.2,
        score: 2,
        estimatedCost: 100,
        acres: 4,
        rxLeverage: 4,
      },
      {
        rank: 1,
        percentTreatableArea: 0.2,
        score: 3,
        estimatedCost: 200,
        acres: 4,
        rxLeverage: 6,
      },
    ];
    fixture.detectChanges();
    const acres = fixture.debugElement.query(
      By.css('[data-id="total-acres"]')
    ).nativeElement;
    // Acres are summed: 4 + 4 + 4.
    expect(acres.innerHTML.trim()).toBe('12');

    const percentTotal = fixture.debugElement.query(
      By.css('[data-id="total-percent"]')
    ).nativeElement;
    // A percentage is averaged, not summed: mean(0.2, 0.2, 0.2) = 0.2.
    expect(percentTotal.innerHTML.trim()).toBe('20%');

    const estimatedCost = fixture.debugElement.query(
      By.css('[data-id="total-estimatedCost"]')
    ).nativeElement;
    // Cost is summed: 100 + 100 + 200.
    expect(estimatedCost.innerHTML.trim()).toBe('$400');
  }));

  it('averages the Rx leverage column instead of summing it', fakeAsync(() => {
    component.showRxLeverage = true;
    component.areas = [
      {
        rank: 1,
        percentTreatableArea: 0.2,
        score: 1,
        estimatedCost: 100,
        acres: 4,
        rxLeverage: 2,
      },
      {
        rank: 2,
        percentTreatableArea: 0.2,
        score: 2,
        estimatedCost: 100,
        acres: 4,
        rxLeverage: 4,
      },
      {
        rank: 3,
        percentTreatableArea: 0.2,
        score: 3,
        estimatedCost: 200,
        acres: 4,
        rxLeverage: 6,
      },
    ];
    tick();
    fixture.detectChanges();

    const rxLeverage = fixture.debugElement.query(
      By.css('[data-id="total-rx-leverage"]')
    ).nativeElement;
    // mean(2, 4, 6) = 4, formatted as a number with the '%' suffix.
    expect(rxLeverage.innerHTML.trim()).toBe('4%');
  }));

  it('hides the Rx leverage column unless showRxLeverage is set', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('[data-id="rxLeverage"]'))
    ).toBeNull();

    component.showRxLeverage = true;
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('[data-id="rxLeverage"]'))
    ).toBeTruthy();
  }));
});
