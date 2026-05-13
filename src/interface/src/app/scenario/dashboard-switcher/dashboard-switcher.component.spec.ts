import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardSwitcherComponent } from './dashboard-switcher.component';

describe('DashboardSwitcherComponent', () => {
  let component: DashboardSwitcherComponent;
  let fixture: ComponentFixture<DashboardSwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardSwitcherComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
