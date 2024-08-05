import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenariosCardListComponent } from './scenarios-card-list.component';

describe('ScenariosCardListComponent', () => {
  let component: ScenariosCardListComponent;
  let fixture: ComponentFixture<ScenariosCardListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenariosCardListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenariosCardListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
