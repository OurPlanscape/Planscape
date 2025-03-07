import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchDataLayersComponent } from './search-data-layers.component';

describe('SearchDataLayersComponent', () => {
  let component: SearchDataLayersComponent;
  let fixture: ComponentFixture<SearchDataLayersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchDataLayersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SearchDataLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
