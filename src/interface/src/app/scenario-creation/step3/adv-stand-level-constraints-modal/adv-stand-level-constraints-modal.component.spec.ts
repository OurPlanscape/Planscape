import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdvStandLevelConstraintsModalComponent } from './adv-stand-level-constraints-modal.component';

describe('AdvStandLevelConstraintsModalComponent', () => {
  let component: AdvStandLevelConstraintsModalComponent;
  let fixture: ComponentFixture<AdvStandLevelConstraintsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdvStandLevelConstraintsModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdvStandLevelConstraintsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
