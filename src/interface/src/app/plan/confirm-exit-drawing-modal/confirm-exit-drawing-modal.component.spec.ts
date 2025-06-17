import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { ConfirmExitDrawingModalComponent } from './confirm-exit-drawing-modal.component';

describe('ConfirmExitDrawingModalComponent', () => {
  let component: ConfirmExitDrawingModalComponent;
  let fixture: ComponentFixture<ConfirmExitDrawingModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmExitDrawingModalComponent],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmExitDrawingModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
