import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatLegacyButtonHarness as MatButtonHarness } from '@angular/material/legacy-button/testing';
import {
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
  MatLegacyDialog as MatDialog,
  MatLegacyDialogRef as MatDialogRef,
} from '@angular/material/legacy-dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { AuthService } from 'src/app/services';

import { DeleteAccountDialogComponent } from './delete-account-dialog.component';

describe('DeleteAccountDialogComponent', () => {
  let component: DeleteAccountDialogComponent;
  let fixture: ComponentFixture<DeleteAccountDialogComponent>;
  let loader: HarnessLoader;
  let fakeAuthService: AuthService;

  beforeEach(async () => {
    fakeAuthService = jasmine.createSpyObj(
      'AuthService',
      {
        deactivateUser: of(true),
      },
      {}
    );
    const fakeData = {
      user: {
        email: 'test@test.com',
      },
    };
    const fakeDialog = jasmine.createSpyObj(
      'MatDialog',
      {
        open: undefined,
      },
      {}
    );
    const fakeDialogRef = jasmine.createSpyObj(
      'MatDialogRef',
      {
        close: undefined,
      },
      {}
    );
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MaterialModule,
        ReactiveFormsModule,
        NoopAnimationsModule,
      ],
      declarations: [DeleteAccountDialogComponent],
      providers: [
        {
          provide: AuthService,
          useValue: fakeAuthService,
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: fakeData,
        },
        {
          provide: MatDialog,
          useValue: fakeDialog,
        },
        {
          provide: MatDialogRef<DeleteAccountDialogComponent>,
          useValue: fakeDialogRef,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteAccountDialogComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('cancel button should close dialog', async () => {
    const dialogRef = fixture.debugElement.injector.get(MatDialogRef);
    const cancelButton: MatButtonHarness = await loader.getHarness(
      MatButtonHarness.with({ text: /CANCEL/ })
    );

    await cancelButton.click();

    expect(dialogRef.close).toHaveBeenCalledOnceWith();
  });

  it('delete button should call AuthService and close dialog', async () => {
    const dialogRef = fixture.debugElement.injector.get(MatDialogRef);
    const deleteButton: MatButtonHarness = await loader.getHarness(
      MatButtonHarness.with({ text: /DEACTIVATE/ })
    );
    component.deleteAccountForm.setValue({
      currentPassword: 'password',
    });

    await deleteButton.click();

    expect(fakeAuthService.deactivateUser).toHaveBeenCalledOnceWith(
      {
        email: 'test@test.com',
      },
      'password'
    );
    expect(dialogRef.close).toHaveBeenCalledOnceWith({ deletedAccount: true });
  });
});
