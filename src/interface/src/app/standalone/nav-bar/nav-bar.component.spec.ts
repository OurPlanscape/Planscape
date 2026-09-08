import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavBarComponent } from './nav-bar.component';
import { AuthService, WINDOW } from '@services';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { LegacyMaterialModule } from '@material/legacy-material.module';
import { RouterTestingModule } from '@angular/router/testing';
import { MockProvider } from 'ng-mocks';
import { firstValueFrom, of } from 'rxjs';
import { ButtonComponent } from '@styleguide';
import { PlanState } from '@plan/plan.state';
import { Plan } from '@types';
import { FEATURES_JSON, FeaturesConfig } from '@app/features/features-config';

describe('NavBarComponent', () => {
  let component: NavBarComponent;
  let fixture: ComponentFixture<NavBarComponent>;

  async function setUpComponent(features: FeaturesConfig = {}) {
    await TestBed.configureTestingModule({
      imports: [
        NavBarComponent,
        LegacyMaterialModule,
        RouterTestingModule,
        ButtonComponent,
      ],
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
          },
        },
        MockProvider(AuthService, {
          isLoggedIn$: of(true),
        }),
        MockProvider(PlanState, {
          currentPlan$: of({ permissions: ['view_collaborator'] } as Plan),
        }),
        { provide: FEATURES_JSON, useValue: features },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavBarComponent);

    component = fixture.componentInstance;

    component.area = 'SCENARIOS';
    fixture.detectChanges();
  }

  it('should create', async () => {
    await setUpComponent();
    expect(component).toBeTruthy();
  });

  it('allows sharing the plan when the workspaces flag is off', async () => {
    await setUpComponent();
    expect(await firstValueFrom(component.canSharePlan$)).toBe(true);
  });

  it('hides the share button when the workspaces flag is on', async () => {
    await setUpComponent({ WORKSPACES: true });
    expect(await firstValueFrom(component.canSharePlan$)).toBe(false);
    expect(fixture.nativeElement.querySelector('[data-id="share"]')).toBeNull();
  });
});
