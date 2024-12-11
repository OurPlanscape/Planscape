import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectAreasComponent } from './project-areas.component';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CurrencyInKPipe } from '@shared';
import { CurrencyPipe } from '@angular/common';
import { By } from '@angular/platform-browser';
import { LegacyMaterialModule } from '../../material/legacy-material.module';

@Component({
  template: '<app-project-areas [areas]="areas"></app-project-areas>',
})
class TestHostComponent {
  areas = [
    {
      rank: 1,
      percentTotal: 0.2234,
      score: 2,
      estimatedCost: 1231.22,
      acres: 120.23,
    },
  ];
}

describe('ProjectAreasComponent', () => {
  let component: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProjectAreasComponent, CurrencyInKPipe, TestHostComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      imports: [LegacyMaterialModule],
      providers: [CurrencyPipe],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    component.areas = [
      {
        rank: 1,
        percentTotal: 0.2234,
        score: 2.1223123123,
        estimatedCost: 1231.22,
        acres: 120.23,
      },
    ];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show `acres` as a number without decimals', () => {
    const queryElement = fixture.debugElement.query(
      By.css('[data-id="acres"]')
    ).nativeElement;
    expect(queryElement.innerHTML).toBe('120');
  });

  it('should display `percentTotal` with two decimal points and as percentage', () => {
    const queryElement = fixture.debugElement.query(
      By.css('[data-id="percentTotal"]')
    ).nativeElement;
    expect(queryElement.innerHTML).toBe('22.34%');
  });

  it('should show `estimatedCost` in K with 2 decimals', () => {
    const queryElement = fixture.debugElement.query(
      By.css('[data-id="estimatedCost"]')
    ).nativeElement;
    expect(queryElement.innerHTML).toBe('$1.23K');
  });

  it('should show `score` as number with two decimals', () => {
    const queryElement = fixture.debugElement.query(
      By.css('[data-id="score"]')
    ).nativeElement;
    expect(queryElement.innerHTML).toBe('2.12');
  });

  it('should calculate totals based on provided areas', () => {
    component.areas = [
      {
        rank: 1,
        percentTotal: 0.2,
        score: 1,
        estimatedCost: 100,
        acres: 4,
      },
      {
        rank: 1,
        percentTotal: 0.2,
        score: 2,
        estimatedCost: 100,
        acres: 4,
      },
      {
        rank: 1,
        percentTotal: 0.2,
        score: 3,
        estimatedCost: 200,
        acres: 4,
      },
    ];
    fixture.detectChanges();
    const acres = fixture.debugElement.query(
      By.css('[data-id="total-acres"]')
    ).nativeElement;
    expect(acres.innerHTML).toBe('12');

    const percentTotal = fixture.debugElement.query(
      By.css('[data-id="total-percent"]')
    ).nativeElement;
    expect(percentTotal.innerHTML.trim()).toBe('60%');

    const estimatedCost = fixture.debugElement.query(
      By.css('[data-id="total-estimatedCost"]')
    ).nativeElement;
    expect(estimatedCost.innerHTML.trim()).toBe('$0.4K');
  });
});
