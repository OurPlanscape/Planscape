import {
  Meta,
  StoryObj,
  moduleMetadata,
  argsToTemplate,
} from '@storybook/angular';
import { ModalComponent } from '../modal/modal.component';
import { ModalConfirmationDialogComponent } from './modal-confirmation-dialog.component';
import {
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

const meta: Meta<ModalConfirmationDialogComponent> = {
  title: 'Components/Modal Confirmation Dialog',
  component: ModalConfirmationDialogComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        MatDialogModule,
        ModalComponent,
        BrowserAnimationsModule,
        ModalConfirmationDialogComponent,
        MatProgressSpinnerModule,
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],
    }),
  ],
  render: ({ ...args }) => ({
    props: args,
    template: `<div ${containerStyle}>
        <sg-modal title=""
        [shortHeader]="true"
        [showBorders]="false"
        [centerFooter]="true">
        <div modalBodyContent>
          <sg-modal-confirmation-dialog ${argsToTemplate(args)}>
          </sg-modal-confirmation-dialog>
          </div>
        </sg-modal><div>`,
  }),
};

export default meta;

type Story = StoryObj<ModalConfirmationDialogComponent>;

const containerStyle = `style="background-color: gray;
      height: 400px;
      align-content: center;
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;"`;

export const InfoBox: Story = {
  args: {
    headline: 'Information Title',
    message:
      'Insert a message to inform users about a situation that requires acknowledgement.',
    infoType: 'alert',
  },
};

export const ErrorBox: Story = {
  args: {
    headline: 'Error Title',
    message: 'Insert a message that the performed action was unsuccessful.',
    infoType: 'error',
  },
};

export const SuccessBox: Story = {
  args: {
    headline: 'Success Title',
    message:
      'Insert a message about the performed action was completed/successful.',
    infoType: 'success',
  },
};

export const PendingBox: Story = {
  args: {
    headline: 'Pending Action Title',
    message: 'Insert a message about the performed action in progress.',
    infoType: 'pending',
  },
};
