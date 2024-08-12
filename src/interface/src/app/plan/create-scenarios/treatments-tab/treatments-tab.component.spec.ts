import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentsTabComponent } from './treatments-tab.component';

describe('TreatmentsTabComponent', () => {
  let component: TreatmentsTabComponent;
  let fixture: ComponentFixture<TreatmentsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentsTabComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TreatmentsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
