import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorizonalCardComponent } from './horizonal-card.component';

describe('HorizonalCardComponent', () => {
  let component: HorizonalCardComponent;
  let fixture: ComponentFixture<HorizonalCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorizonalCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HorizonalCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
