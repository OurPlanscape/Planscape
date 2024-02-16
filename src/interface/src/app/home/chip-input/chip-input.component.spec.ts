import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChipInputComponent } from './chip-input.component';

describe('ChipInputComponent', () => {
  let component: ChipInputComponent;
  let fixture: ComponentFixture<ChipInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChipInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChipInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
