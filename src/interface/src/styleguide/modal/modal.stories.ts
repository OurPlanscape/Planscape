import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { ModalComponent } from './modal.component';

type InputAndCustomArgs = ModalComponent & { placeholder: string };

const meta: Meta<InputAndCustomArgs> = {
  title: 'Components/Modal Demo',
  component: ModalComponent,
  tags: ['autodocs'],

  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
    moduleMetadata({ imports: [MatDialogModule] }),
  ],
  render: ({ placeholder, ...args }) => ({
    props: args,
    template: `
    <button>Here is a button</button>
     <sg-modal ></sg-modal>
`,
  }),
};

export default meta;
type Story = StoryObj<InputAndCustomArgs>;

export const Default: Story = {};
