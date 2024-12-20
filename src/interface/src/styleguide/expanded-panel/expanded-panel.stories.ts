import {
  argsToTemplate,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ModalInfoComponent } from '../modal-info-box/modal-info.component';
import { ExpandedPanelComponent } from './expanded-panel.component';

const meta: Meta<ExpandedPanelComponent> = {
  title: 'Components/Expanded Panel',
  component: ExpandedPanelComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [MatDialogModule, BrowserAnimationsModule, ModalInfoComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],
    }),
  ],
};

export default meta;

type Story = StoryObj<ExpandedPanelComponent>;

const containerStyle = `style="background-color: gray;
    height: 400px;
    align-content: center;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;"`;

export const Default: Story = {
  args: {},
  render: (args) => ({
    props: args,
    template: `<div ${containerStyle}>
      <sg-expanded-panel ${argsToTemplate(args)}>
        <div panelTitle>The title</div>
        <div panelContent>Just a basic expaded panel</div>
      </sg-expanded-panel><div>`,
  }),
};
