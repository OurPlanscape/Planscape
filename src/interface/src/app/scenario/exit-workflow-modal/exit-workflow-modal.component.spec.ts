import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { ExitWorkflowModalComponent } from './exit-workflow-modal.component';

describe('ExitWorkflowModalComponent', () => {
  let component: ExitWorkflowModalComponent;
  let fixture: ComponentFixture<ExitWorkflowModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExitWorkflowModalComponent],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExitWorkflowModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
