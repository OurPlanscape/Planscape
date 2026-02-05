import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountValidationComponent } from './account-validation.component';
import { AuthService } from '@services';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';

describe('AccountValidationComponent', () => {
  let component: AccountValidationComponent;
  let fixture: ComponentFixture<AccountValidationComponent>;

  const fakeAuthService = jasmine.createSpyObj<AuthService>(
    'AuthService',
    { validateAccount: of(true) },
    {}
  );
  beforeEach(async () => {
    const fakeRoute = jasmine.createSpyObj(
      'ActivatedRoute',
      {},
      {
        snapshot: {
          paramMap: convertToParamMap({ id: '1234567890' }),
        },
      }
    );
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, AccountValidationComponent],
      declarations: [],
      providers: [
        { provide: AuthService, useValue: fakeAuthService },
        { provide: ActivatedRoute, useValue: fakeRoute },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AccountValidationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('different tokens should display valid responses', () => {
    it('should show confirmation when token is valid', () => {
      fakeAuthService.validateAccount.and.returnValue(of(true));
      component.checkValidation();

      fixture.detectChanges();

      const validBlurb = fixture.debugElement.query(By.css('.valid-token'));
      expect(validBlurb).not.toBeNull();

      const invalidBlurb = fixture.debugElement.query(By.css('.invalid-token'));
      expect(invalidBlurb).toBeNull();
    });

    it('should show failure when token is not valid', () => {
      fakeAuthService.validateAccount.and.returnValue(of(false));
      component.checkValidation();

      fixture.detectChanges();
      const validBlurb = fixture.debugElement.query(By.css('.valid-token'));
      expect(validBlurb).toBeNull();

      const invalidBlurb = fixture.debugElement.query(By.css('.invalid-token'));
      expect(invalidBlurb).not.toBeNull();
    });
  });
});
