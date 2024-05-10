import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AreaDetailsComponent } from './area-details.component';
import { Plan } from '@types';
import { MOCK_PLAN } from '@services/mocks';

describe('AreaDetailsComponent', () => {
  let component: AreaDetailsComponent;
  let fixture: ComponentFixture<AreaDetailsComponent>;

  const fakePlan: Plan = MOCK_PLAN;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AreaDetailsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AreaDetailsComponent);
    component = fixture.componentInstance;
    component.plan = fakePlan;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
