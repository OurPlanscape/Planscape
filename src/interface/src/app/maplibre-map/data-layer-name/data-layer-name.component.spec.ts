import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataLayerNameComponent } from './data-layer-name.component';

describe('DataLayerNameComponent', () => {
  let component: DataLayerNameComponent;
  let fixture: ComponentFixture<DataLayerNameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataLayerNameComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DataLayerNameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
