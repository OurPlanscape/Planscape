import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { provideAnimations } from '@angular/platform-browser/animations';
import { OpacitySliderComponent } from './opacity-slider.component';

const meta: Meta<OpacitySliderComponent> = {
  title: 'Components/Opacity Slider Card',
  component: OpacitySliderComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<div style="width:280px"><sg-opacity-slider ${argsToTemplate(args)}></sg-opacity-slider></div>`,
  }),
};

export default meta;
type Story = StoryObj<OpacitySliderComponent>;

export const Default: Story = {
  args: {},
};

export const ChangedLabel: Story = {
  args: {
    ...Default.args,
    title: 'Arbitrary Title',
  },
};
