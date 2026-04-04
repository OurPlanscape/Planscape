import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ToolInfoCardComponent } from './tool-info-card.component';

const meta: Meta<ToolInfoCardComponent> = {
  title: 'Components/Tool Info Card',
  component: ToolInfoCardComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-tool-info-card ${argsToTemplate(args)}></sg-tool-info-card>`,
  }),
};

export default meta;
type Story = StoryObj<ToolInfoCardComponent>;

export const Default: Story = {
  args: {
    title: 'Test Module',
    mainImagePath: '/assets/svg/icons/treatment-effects.svg',
    creditImageAlt: '2024-01-01 12:34:00',
    creditImagePath: 'assets/svg/icons/planscape-color-logo-w-text.svg',
    description:
      'This is some explanatory text that describes the module itself. It might contain a lot of details like background information, instructions, or whatever else is helpful for the user.',
  },
};
