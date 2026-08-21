import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdvStandLevelConstraintsComponent } from './adv-stand-level-constraints.component';

describe('AdvStandLevelConstraintsComponent', () => {
  let component: AdvStandLevelConstraintsComponent;
  let fixture: ComponentFixture<AdvStandLevelConstraintsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdvStandLevelConstraintsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdvStandLevelConstraintsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
