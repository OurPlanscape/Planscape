import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';
import { MatDialogModule } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ModalWrapperComponent } from './modal-wrapper.component';

const meta: Meta<ModalWrapperComponent> = {
  title: 'Components/Interactive Modal',
  component: ModalWrapperComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      declarations: [ModalWrapperComponent],
      imports: [MatDialogModule, BrowserAnimationsModule],
    }),
  ],
};

export default meta;
type Story = StoryObj<ModalWrapperComponent>;

export const Default: Story = {
  args: {
    title: 'Storybook Modal Title',
  },
};
