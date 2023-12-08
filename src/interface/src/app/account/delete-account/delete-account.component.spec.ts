import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteAccountComponent } from './delete-account.component';
import { MaterialModule } from '../../material/material.module';
import { MatDialogModule } from '@angular/material/dialog';
import { MockProvider } from 'ng-mocks';
import { AuthService } from '../../services';
import { Router } from '@angular/router';

describe('DeleteAccountComponent', () => {
  let component: DeleteAccountComponent;
  let fixture: ComponentFixture<DeleteAccountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeleteAccountComponent],
      imports: [MaterialModule, MatDialogModule],
      providers: [MockProvider(AuthService), MockProvider(Router)],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteAccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
