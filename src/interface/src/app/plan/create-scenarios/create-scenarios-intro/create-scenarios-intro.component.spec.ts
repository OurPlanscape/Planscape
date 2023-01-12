import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateScenariosIntroComponent } from './create-scenarios-intro.component';

describe('CreateScenariosIntroComponent', () => {
  let component: CreateScenariosIntroComponent;
  let fixture: ComponentFixture<CreateScenariosIntroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateScenariosIntroComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateScenariosIntroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
