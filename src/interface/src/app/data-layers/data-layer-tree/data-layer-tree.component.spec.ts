import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataLayerTreeComponent } from './data-layer-tree.component';

describe('DataLayerTreeComponent', () => {
  let component: DataLayerTreeComponent;
  let fixture: ComponentFixture<DataLayerTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataLayerTreeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DataLayerTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
