import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuComponent } from '@app/account/menu/menu.component';
import { MockProvider } from 'ng-mocks';
import { AuthService } from '@services';

import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';

describe('MenuComponent', () => {
  let component: MenuComponent;
  let fixture: ComponentFixture<MenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MenuComponent],
      providers: [
        MockProvider(AuthService),
        { provide: ActivatedRoute, useValue: { snapshot: {} } },
      ],
      imports: [RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
