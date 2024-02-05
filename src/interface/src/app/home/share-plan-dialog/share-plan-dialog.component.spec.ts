import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharePlanDialogComponent } from './share-plan-dialog.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MaterialModule } from '../../material/material.module';
import { MockProvider } from 'ng-mocks';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('SharePlanDialogComponent', () => {
  let component: SharePlanDialogComponent;
  let fixture: ComponentFixture<SharePlanDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SharePlanDialogComponent],
      imports: [MaterialModule, MatSnackBarModule, NoopAnimationsModule],
      providers: [
        MockProvider(MatDialogRef),
        { provide: MAT_DIALOG_DATA, useValue: { data: { name: 'Plan One' } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SharePlanDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
