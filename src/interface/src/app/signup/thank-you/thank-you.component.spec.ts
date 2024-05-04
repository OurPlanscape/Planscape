import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThankYouComponent } from './thank-you.component';
import { MockComponent } from 'ng-mocks';
import { CreditsBlurbComponent } from '@shared';
import { LearnMoreComponent } from '../../home/learn-more/learn-more.component';

describe('ThankYouComponent', () => {
  let component: ThankYouComponent;
  let fixture: ComponentFixture<ThankYouComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        ThankYouComponent,
        MockComponent(CreditsBlurbComponent),
        MockComponent(LearnMoreComponent),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ThankYouComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
