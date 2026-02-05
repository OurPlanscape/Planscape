import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChipSelectorComponent } from '@styleguide/chip-selector/chip-selector.component';

describe('ChipSelectorComponent', () => {
  let component: ChipSelectorComponent<any>;
  let fixture: ComponentFixture<ChipSelectorComponent<any>>;

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
