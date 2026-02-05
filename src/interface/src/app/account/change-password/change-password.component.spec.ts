import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangePasswordComponent } from '@app/account/change-password/change-password.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MockProvider } from 'ng-mocks';
import { AuthService } from '@services';
import { BehaviorSubject } from 'rxjs';
import { User } from '@types';
import { FeatureService } from '@app/features/feature.service';

describe('ChangePasswordComponent', () => {
  let component: ChangePasswordComponent;
  let fixture: ComponentFixture<ChangePasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChangePasswordComponent],
      imports: [ReactiveFormsModule],
      providers: [
        MockProvider(AuthService, {
          loggedInUser$: new BehaviorSubject<User | null | undefined>(
            undefined
          ),
        }),
        MockProvider(FeatureService),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
