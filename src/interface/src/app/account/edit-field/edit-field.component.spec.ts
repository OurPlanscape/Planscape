import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditFieldComponent } from './edit-field.component';
import { MockProvider } from 'ng-mocks';
import { AuthService } from '../../services';
import { ReactiveFormsModule } from '@angular/forms';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { of } from 'rxjs';
import { MaterialModule } from '../../material/material.module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('EditFieldComponent', () => {
  let component: EditFieldComponent;
  let fixture: ComponentFixture<EditFieldComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditFieldComponent],
      providers: [MockProvider(AuthService)],
      imports: [ReactiveFormsModule, MaterialModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(EditFieldComponent);
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
