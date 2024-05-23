import { LegacyMaterialModule } from '../../material/legacy-material.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanNavigationBarComponent } from './plan-navigation-bar.component';

describe('BottomBarComponent', () => {
  let component: PlanNavigationBarComponent;
  let fixture: ComponentFixture<PlanNavigationBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LegacyMaterialModule],
      declarations: [PlanNavigationBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanNavigationBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
