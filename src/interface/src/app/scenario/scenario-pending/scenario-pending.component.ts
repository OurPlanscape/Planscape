import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '@styleguide';

@Component({
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    MatButtonModule,
    RouterModule,
    ButtonComponent,
  ],
  selector: 'app-scenario-pending',
  templateUrl: './scenario-pending.component.html',
  styleUrls: ['./scenario-pending.component.scss'],
})
export class ScenarioPendingComponent {
  @Output() goBack = new EventEmitter();
}
