import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AcresTreatedComponent } from './acres-treated.component';

describe('AcresTreatedComponent', () => {
  let component: AcresTreatedComponent;
  let fixture: ComponentFixture<AcresTreatedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcresTreatedComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AcresTreatedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
