import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataSetComponent } from './data-set.component';

describe('DataSetComponent', () => {
  let component: DataSetComponent;
  let fixture: ComponentFixture<DataSetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataSetComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DataSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
