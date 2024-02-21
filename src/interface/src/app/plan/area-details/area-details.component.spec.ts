import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AreaDetailsComponent } from './area-details.component';
import { Plan, Region } from '../../types';

describe('AreaDetailsComponent', () => {
  let component: AreaDetailsComponent;
  let fixture: ComponentFixture<AreaDetailsComponent>;

  const fakePlan: Plan = {
    id: 'temp',
    name: 'somePlan',
    ownerId: 'owner',
    region: Region.SIERRA_NEVADA,
    area_acres: 123,
    area_m2: 231,
    creator: 'John Doe',
  };

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
