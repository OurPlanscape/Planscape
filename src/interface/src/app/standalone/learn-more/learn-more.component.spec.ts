import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LearnMoreComponent } from '@app/standalone/learn-more/learn-more.component';
import { MockComponent } from 'ng-mocks';
import { HorizonalCardComponent } from '@app/standalone/horizonal-card/horizonal-card.component';

describe('LearnMoreComponent', () => {
  let component: LearnMoreComponent;
  let fixture: ComponentFixture<LearnMoreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LearnMoreComponent, MockComponent(HorizonalCardComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(LearnMoreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
