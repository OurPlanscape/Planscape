import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';

import { AuthService } from '../services';
import { User } from './../services/auth.service';
import { AccountDialogComponent } from './account-dialog.component';

describe('AccountDialogComponent', () => {
  let component: AccountDialogComponent;
  let fixture: ComponentFixture<AccountDialogComponent>;

  beforeEach(() => {
    const fakeAuthService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      {},
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
});
