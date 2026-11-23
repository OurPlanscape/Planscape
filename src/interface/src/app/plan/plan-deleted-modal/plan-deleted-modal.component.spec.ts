import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PlanDeletedModalComponent } from './plan-deleted-modal.component';

describe('PlanDeletedModalComponent', () => {
  let fixture: ComponentFixture<PlanDeletedModalComponent>;
  let close: jasmine.Spy;

  beforeEach(async () => {
    close = jasmine.createSpy('close');
    await TestBed.configureTestingModule({
      imports: [PlanDeletedModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: { planName: 'Tahoe' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanDeletedModalComponent);
    fixture.detectChanges();
  });

  it('names the plan that is gone', () => {
    expect(fixture.nativeElement.textContent).toContain(
      'Tahoe is no longer available'
    );
  });

  it('closes when acknowledged', () => {
    fixture.componentInstance.close();

    expect(close).toHaveBeenCalledWith(true);
  });
});
