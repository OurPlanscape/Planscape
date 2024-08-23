import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { ExpanderComponent } from './expander.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const meta: Meta<ExpanderComponent> = {
  title: 'Components/Expander',
  component: ExpanderComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-expander ${argsToTemplate(args)}></sg-expander>`,
  }),
};

export default meta;
type Story = StoryObj<ExpanderComponent>;

export const Default: Story = {
  args: {
    title: 'Expander Example',
  },
};
