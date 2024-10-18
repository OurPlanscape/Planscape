import { Meta, moduleMetadata, StoryObj } from '@storybook/angular';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ModalComponent } from '@styleguide';
import { ErrorDialogComponent } from './error-dialog/error-dialog.component';
import { PendingDialogComponent } from './pending-dialog/pending-dialog.component';
import { DialogData } from './dialogs';

// Common styles for both stories
const containerStyle = `style="background-color: gray;
      height: 400px;
      align-content: center;
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;"`;

const meta: Meta<ErrorDialogComponent | PendingDialogComponent> = {
  title: 'Components/Dialogs',

  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        MatDialogModule,
        ModalComponent,
        BrowserAnimationsModule,
        MatProgressSpinnerModule,
        ErrorDialogComponent,
        PendingDialogComponent,
      ],
      providers: [
        { provide: MatDialogRef, useValue: {} }, // Provide a dummy MatDialogRef
      ],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: `A generic dialogs to be used to display simple messages.

Provide data with the  \`DialogData\` interface, via \`MAT_DIALOG_DATA\`.


Clicking the primary button will resolve \`afterClose()\` to \`true\`, and clicking the secondary will resolve \`afterClose()\` to \`false\`.`,
      },
    },
  },
};

export default meta;

type Story = StoryObj<ErrorDialogComponent | PendingDialogComponent>;

// Story for ErrorDialogComponent
export const ErrorDialog: Story = {
  decorators: [
    moduleMetadata({
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            primaryButtonText: 'primary action',
            headline: 'Unable to create resource',
            message:
              'There was an error. Please check your internet connection and try again.',
          } as DialogData,
        },
      ],
    }),
  ],
  render: ({ ...args }) => ({
    props: args,
    template: `<div ${containerStyle}><sg-error-dialog></sg-error-dialog></div>`,
  }),
};

// Story for PendingDialogComponent
export const PendingDialog: Story = {
  decorators: [
    moduleMetadata({
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            primaryButtonText: 'Continue',
            headline: 'Processing...',
            message: 'Your request is being processed. Please wait.',
          } as DialogData,
        },
      ],
    }),
  ],
  render: ({ ...args }) => ({
    props: args,
    template: `<div ${containerStyle}><sg-pending-dialog></sg-pending-dialog></div>`,
  }),
};
