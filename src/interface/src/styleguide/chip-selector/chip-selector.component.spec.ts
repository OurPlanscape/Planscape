import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChipSelectorComponent } from './chip-selector.component';

describe('ChipSelectorComponent', () => {
  let component: ChipSelectorComponent;
  let fixture: ComponentFixture<ChipSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChipSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
