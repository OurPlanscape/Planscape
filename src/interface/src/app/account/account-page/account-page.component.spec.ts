import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountPageComponent } from '@app/account/account-page/account-page.component';
import { MockComponent, MockProvider } from 'ng-mocks';
import { AuthService } from '@services';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MenuComponent } from '@app/account/menu/menu.component';

describe('AccountPageComponent', () => {
  let component: AccountPageComponent;
  let fixture: ComponentFixture<AccountPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountPageComponent, MockComponent(MenuComponent)],
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
