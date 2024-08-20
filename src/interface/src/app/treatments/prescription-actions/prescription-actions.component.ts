import { Component } from '@angular/core';
import { LookupService } from '@services/lookup.service';
import {
  AsyncPipe,
  JsonPipe,
  KeyValuePipe,
  NgForOf,
  NgIf,
} from '@angular/common';
import { ButtonComponent } from '@styleguide';

@Component({
  selector: 'app-prescription-actions',
  standalone: true,
  imports: [NgIf, AsyncPipe, JsonPipe, ButtonComponent, NgForOf, KeyValuePipe],
  templateUrl: './prescription-actions.component.html',
  styleUrl: './prescription-actions.component.scss',
})
export class PrescriptionActionsComponent {
  prescriptions$ = this.lookupService.getPrescriptions();

  constructor(private lookupService: LookupService) {}
}
