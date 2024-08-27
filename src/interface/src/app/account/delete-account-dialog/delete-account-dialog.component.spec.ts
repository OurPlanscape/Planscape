import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatLegacyButtonHarness as MatButtonHarness } from '@angular/material/legacy-button/testing';

import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { LegacyMaterialModule } from '../../material/legacy-material.module';
import { AuthService } from '@services';

import { DeleteAccountDialogComponent } from './delete-account-dialog.component';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';

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
        LegacyMaterialModule,
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
