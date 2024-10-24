import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendingDialogComponent } from './pending-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

describe('PendingDialogComponent', () => {
  let component: PendingDialogComponent;
  let fixture: ComponentFixture<PendingDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendingDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            headline: 'one pending thing',
            message: 'one message',
            primaryButtonText: 'got it',
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PendingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
