import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditUserFieldComponent } from './edit-user-field.component';
import { MockProvider } from 'ng-mocks';
import { AuthService } from '@services';
import { ReactiveFormsModule } from '@angular/forms';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatLegacyButtonHarness as MatButtonHarness } from '@angular/material/legacy-button/testing';
import { of } from 'rxjs';
import { LegacyMaterialModule } from '../../material/legacy-material.module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('EditFieldComponent', () => {
  let component: EditUserFieldComponent;
  let fixture: ComponentFixture<EditUserFieldComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditUserFieldComponent],
      providers: [MockProvider(AuthService)],
      imports: [
        ReactiveFormsModule,
        LegacyMaterialModule,
        NoopAnimationsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditUserFieldComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should submit the form calling auth service to update the user', async () => {
    const authService = TestBed.inject(AuthService);
    const newName = 'John';
    spyOn(authService, 'updateUserInfo').and.returnValue(of({}));

    component.userField = 'firstName';
    component.state = 'editing';
    component.form.get('name')?.setValue(newName);
    fixture.detectChanges();

    const submitButton: MatButtonHarness = await loader.getHarness(
      MatButtonHarness.with({ text: /SAVE/ })
    );
    await submitButton.click();
    expect(authService.updateUserInfo).toHaveBeenCalledOnceWith({
      firstName: newName,
    });
  });
});
