import {
  argsToTemplate,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { ModalComponent } from '@styleguide/modal/modal.component';
import { ModalConfirmationDialogComponent } from '@styleguide/modal-confirmation-dialog/modal-confirmation-dialog.component';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
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

          <sg-modal-confirmation-dialog ${argsToTemplate(args)}>
          </sg-modal-confirmation-dialog>

        <div>`,
  }),
};

export default meta;

type Story = StoryObj<ModalConfirmationDialogComponent>;

const containerStyle = `style="background-color: white;
      height: 400px;
      align-content: center;
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;"`;

export const PendingBox: Story = {
  args: {
    headline: 'Pending Action Title',
    message: 'Insert a message about the performed action in progress.',
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
