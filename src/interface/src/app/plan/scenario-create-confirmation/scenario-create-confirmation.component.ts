import { Input, Component } from '@angular/core';
import { ModalConfirmationDialogComponent } from '../../../styleguide/modal-dialog-section/modal-confirmation-dialog.component
import { ModalComponent } from '../../../styleguide/modal/modal.component';

@Component({
  selector: 'app-scenario-create-confirmation',
  standalone: true,
  imports: [ModalComponent, ModalConfirmationDialogComponent],
  templateUrl: './scenario-create-confirmation.component.html',
  styleUrl: './scenario-create-confirmation.component.scss',
})
export class ScenarioCreateConfirmationComponent {
  @Input() scenarioName = '';

}
