import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteAccountComponent } from './delete-account.component';
import { LegacyMaterialModule } from '../../material/legacy-material.module';

import { MockProvider } from 'ng-mocks';
import { AuthService } from '@services';
import { Router } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';

describe('DeleteAccountComponent', () => {
  let component: DeleteAccountComponent;
  let fixture: ComponentFixture<DeleteAccountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeleteAccountComponent],
      imports: [LegacyMaterialModule, MatDialogModule],
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
