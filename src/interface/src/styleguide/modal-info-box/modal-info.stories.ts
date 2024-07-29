import {
  Meta,
  StoryObj,
  moduleMetadata,
  argsToTemplate,
} from '@storybook/angular';
import { ModalComponent } from '../modal/modal.component';
import { ModalInfoComponent } from './modal-info.component';
import {
  MatDialogModule,
  MAT_DIALOG_DATA,
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
        <div modalBodyContent>
          <sg-modal-info ${argsToTemplate(args)}>
          </sg-modal-info>
          </div>
        </sg-modal><div>`,
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
