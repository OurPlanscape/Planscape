import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { InputComponent } from './input.component';
import { provideAnimations } from '@angular/platform-browser/animations';

/**
 *Inputs
 */
const meta: Meta<InputComponent> = {
  title: 'Components/Input',
  component: InputComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `
     <sg-input ${argsToTemplate(args)}>`,
  }),
};

export default meta;
type Story = StoryObj<InputComponent>;

export const Default: Story = {
  args: {
    leadingIcon: 'add_box',
    value: 'Some text',
    placeholder: 'Some placeholder',
    error: false,
    suffix: '',
    trailingIcon: '',
    disabled: false,
    supportMessage: 'Enter whatever you like',
  },
};
