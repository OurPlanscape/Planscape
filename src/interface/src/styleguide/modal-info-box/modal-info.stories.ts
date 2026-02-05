import {
  argsToTemplate,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { ModalComponent } from '@styleguide/modal/modal.component';
import { ModalInfoComponent } from './modal-info.component';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

const meta: Meta<ModalInfoComponent> = {
  title: 'Components/Modal Info Box',
  component: ModalInfoComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        MatDialogModule,
        ModalComponent,
        BrowserAnimationsModule,
        ModalInfoComponent,
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
        <sg-modal>
          <sg-modal-info modalInfoBox ${argsToTemplate(args)} ></sg-modal-info>
          <div modalBodyContent>The rest of the modal content.</div>
        </sg-modal>
        <div>`,
  }),
};

export default meta;

type Story = StoryObj<ModalInfoComponent>;

const containerStyle = `style="background-color: gray;
      height: 400px;
      align-content: center;
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;"`;

export const InfoBox: Story = {
  args: {
    message: 'Project area(s) must be within this planning area.',
    infoType: 'info',
    leadingIcon: 'info',
  },
};

export const WarningBox: Story = {
  args: {
    leadingIcon: 'warning',
    message:
      'This is a warning, and the text being displayed is going to be a few lines long. The line-height for our font should accomodate this long warning.',
    infoType: 'warning',
  },
};

export const ErrorBox: Story = {
  args: {
    leadingIcon: 'error',
    message: 'There was an error.',
    infoType: 'error',
  },
};

export const BannerBox: Story = {
  args: {
    message: 'Estimated time remaining: 3 minutes.',
    infoType: 'banner',
  },
};

export const ProgressBox: Story = {
  args: {
    leadingIcon: 'assignment',
    message: 'An item is in progress.',
    infoType: 'inProgress',
  },
};

export const ProgressCompleteBox: Story = {
  args: {
    leadingIcon: 'assignment',
    message: 'An item was completed.',
    infoType: 'complete',
  },
};
