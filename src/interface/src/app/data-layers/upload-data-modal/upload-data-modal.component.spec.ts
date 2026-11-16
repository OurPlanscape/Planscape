import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatDialogRef } from '@angular/material/dialog';
import { UploadDataModalComponent } from './upload-data-modal.component';

describe('UploadDataModalComponent', () => {
  let fixture: ComponentFixture<UploadDataModalComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<UploadDataModalComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [UploadDataModalComponent],
      providers: [{ provide: MatDialogRef, useValue: dialogRef }],
    }).compileComponents();

    fixture = TestBed.createComponent(UploadDataModalComponent);
    fixture.detectChanges();
  });

  const button = (label: string) =>
    fixture.debugElement
      .queryAll(By.css('button'))
      .find((b) => b.nativeElement.textContent.trim() === label)!;

  it('walks through the upload steps', () => {
    const steps = fixture.debugElement
      .queryAll(By.css('.steps li'))
      .map((li) => li.nativeElement.textContent.replace(/\s+/g, ' ').trim());

    expect(steps.length).toBe(6);
    expect(steps[3]).toBe('Workspace selection');
  });

  it('closes on cancel', () => {
    button('Cancel').nativeElement.click();

    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('stays open on continue, until the QGIS hand-off exists', () => {
    button('Continue To QGIS').nativeElement.click();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
