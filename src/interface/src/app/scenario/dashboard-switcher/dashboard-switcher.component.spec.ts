import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DashboardSwitcherComponent } from './dashboard-switcher.component';
import { ActivatedRoute } from '@angular/router';

describe('DashboardSwitcherComponent', () => {
  let component: DashboardSwitcherComponent;
  let fixture: ComponentFixture<DashboardSwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardSwitcherComponent, HttpClientTestingModule],
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: {} } }],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
