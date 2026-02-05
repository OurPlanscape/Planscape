import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsComponent } from './details.component';
import { MockComponent, MockProvider } from 'ng-mocks';
import { AuthService } from '@services';
import { EditUserFieldComponent } from '@account/edit-user-field/edit-user-field.component';

describe('DetailsComponent', () => {
  let component: DetailsComponent;
  let fixture: ComponentFixture<DetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DetailsComponent, MockComponent(EditUserFieldComponent)],
      providers: [MockProvider(AuthService)],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
