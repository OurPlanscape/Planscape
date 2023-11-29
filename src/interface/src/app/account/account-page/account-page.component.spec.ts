import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountPageComponent } from './account-page.component';
import { MockProvider } from 'ng-mocks';
import { AuthService } from '../../services';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

describe('AccountPageComponent', () => {
  let component: AccountPageComponent;
  let fixture: ComponentFixture<AccountPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountPageComponent],
      providers: [
        MockProvider(AuthService),
        { provide: ActivatedRoute, useValue: { firstChild: {} } },
      ],
      imports: [RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
