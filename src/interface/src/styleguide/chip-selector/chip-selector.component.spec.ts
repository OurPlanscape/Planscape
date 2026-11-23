import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ChipSelectorComponent } from './chip-selector.component';

const LONG_NAME =
  'Prioritize Areas with High Expected Tree Volume Loss from Wildfire';

describe('ChipSelectorComponent', () => {
  let component: ChipSelectorComponent<any>;
  let fixture: ComponentFixture<ChipSelectorComponent<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipSelectorComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ChipSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function chipRow() {
    return fixture.debugElement.query(By.css('mat-chip-row')).nativeElement;
  }

  function chipLabel() {
    return fixture.debugElement.query(By.css('.chip-label'))
      .nativeElement as HTMLElement;
  }

  function renderWith(truncate: boolean) {
    component.items = [{ name: LONG_NAME }];
    component.truncate = truncate;
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lets a name run its full length by default', () => {
    renderWith(false);

    expect(chipRow().classList.contains('truncate')).toBeFalse();
    expect(chipLabel().getAttribute('title')).toBe('');
    expect(chipLabel().textContent?.trim()).toBe(LONG_NAME);
  });

  it('cuts a name that does not fit, and keeps it for the hover', () => {
    renderWith(true);

    expect(chipRow().classList.contains('truncate')).toBeTrue();
    expect(chipLabel().getAttribute('title')).toBe(LONG_NAME);
    expect(chipLabel().textContent?.trim()).toBe(LONG_NAME);
  });
});
