import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavBarComponent } from './nav-bar.component';
import { AuthService, WINDOW } from '@services';
import { By } from '@angular/platform-browser';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { LegacyMaterialModule } from '../../material/legacy-material.module';
import { RouterTestingModule } from '@angular/router/testing';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { ButtonComponent } from '@styleguide';
import { PlanState } from '../../plan/plan.state';
import { Plan } from '@types';

describe('NavBarComponent', () => {
  let component: NavBarComponent;
  let fixture: ComponentFixture<NavBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LegacyMaterialModule, RouterTestingModule, ButtonComponent],
      declarations: [NavBarComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        {
          provide: WINDOW,
          useValue: {
            location: {
              href: 'some-url',
            },
            navigator: {
              clipboard: {
                writeText: () => {},
              },
            },
            print: () => {},
          },
        },
        MockProvider(AuthService, {
          isLoggedIn$: of(true),
        }),
        MockProvider(PlanState, { currentPlan$: of({} as Plan) }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavBarComponent);

    component = fixture.componentInstance;

    component.area = 'SCENARIO';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open print menu when clicking on print', () => {
    const window = TestBed.inject(WINDOW);
    spyOn(window, 'print');
    const printLink = fixture.debugElement.query(By.css('[data-id="print"]'));
    printLink.nativeElement.click();

    expect(window.print).toHaveBeenCalled();
  });
});
