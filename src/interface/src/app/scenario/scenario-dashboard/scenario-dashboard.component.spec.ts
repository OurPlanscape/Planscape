import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioDashboardComponent } from './scenario-dashboard.component';
import { MockDeclaration } from 'ng-mocks';
import { NavBarComponent } from '@app/shared/nav-bar/nav-bar.component';

describe('ScenarioDashboardComponent', () => {
  let component: ScenarioDashboardComponent;
  let fixture: ComponentFixture<ScenarioDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioDashboardComponent],
      declarations: [MockDeclaration(NavBarComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
