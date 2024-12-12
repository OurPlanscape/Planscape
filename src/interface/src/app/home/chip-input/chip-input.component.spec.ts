import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChipInputComponent } from './chip-input.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatLegacyChipsModule } from '@angular/material/legacy-chips';

describe('ChipInputComponent', () => {
  let component: ChipInputComponent;
  let fixture: ComponentFixture<ChipInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChipInputComponent],
      imports: [
        MatFormFieldModule,
        MatInputModule,
        NoopAnimationsModule,
        MatLegacyChipsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChipInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
