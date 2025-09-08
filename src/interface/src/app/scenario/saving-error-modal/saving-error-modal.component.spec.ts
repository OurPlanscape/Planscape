import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavingErrorModalComponent } from './saving-error-modal.component';
import { MatDialogRef } from '@angular/material/dialog';

describe('SavingErrorModalComponent', () => {
  let component: SavingErrorModalComponent;
  let fixture: ComponentFixture<SavingErrorModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavingErrorModalComponent],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SavingErrorModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
