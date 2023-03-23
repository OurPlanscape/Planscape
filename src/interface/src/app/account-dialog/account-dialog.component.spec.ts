import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';

import { AuthService } from '../services';
import { User } from './../types/user.types';
import { AccountDialogComponent } from './account-dialog.component';

describe('AccountDialogComponent', () => {
  let component: AccountDialogComponent;
  let fixture: ComponentFixture<AccountDialogComponent>;
  let fakeAuthService: AuthService;

  beforeEach(() => {
    fakeAuthService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      {
        logout: of(),
      },
      {
        loggedInUser$: new BehaviorSubject<User | null>(null),
      }
    );
    TestBed.configureTestingModule({
      imports: [MaterialModule],
      declarations: [AccountDialogComponent],
      providers: [{ provide: AuthService, useValue: fakeAuthService }],
    });
    fixture = TestBed.createComponent(AccountDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('can load instance', () => {
    expect(component).toBeTruthy();
  });

  it('logs user out', () => {
    component.logout();

    expect(fakeAuthService.logout).toHaveBeenCalledOnceWith();
  });
});
