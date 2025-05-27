import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewCreateScenariosComponent } from './new-create-scenarios.component';

describe('NewCreateScenariosComponent', () => {
  let component: NewCreateScenariosComponent;
  let fixture: ComponentFixture<NewCreateScenariosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewCreateScenariosComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NewCreateScenariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
