import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreditsBlurbComponent } from '@shared/credits-blurb/credits-blurb.component';

describe('CreditsBlurbComponent', () => {
  let component: CreditsBlurbComponent;
  let fixture: ComponentFixture<CreditsBlurbComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreditsBlurbComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreditsBlurbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
