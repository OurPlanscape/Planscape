import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { ExpanderComponent } from './expander.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const containerStyle = `style="display: flex;
  width: 100%;
  height: 180px;
  background-color: lightgray;
  align-items: center;
  justify-content: start;
  padding: 10px;
  flex-direction: column;"`;

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
    template: `<div ${containerStyle}><div style="width:400px;"><sg-expander ${argsToTemplate(args)}></sg-expander></div>`,
  }),
};

export default meta;
type Story = StoryObj<ExpanderComponent>;

export const Default: Story = {
  args: {
    title: 'Moderate Mastication',
    rxDetails: [
      { name: 'Moderate mastication & Pile burn', year: 0 },
      { name: 'Prescribed fire', year: 0 },
    ],
  },
};
