import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { DebounceInputComponent } from './debounce-input.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const meta: Meta<DebounceInputComponent> = {
  title: 'Components/Debounce Input',
  component: DebounceInputComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<div style="width:600px;height:180px;background-color:#aaaaaa;">
    <div style="width:320px;margin-left:auto;margin-right:auto;padding:20px;"><sg-debounce-input ${argsToTemplate(args)}></sg-debounce-input></div></div>`,
  }),
};

export default meta;
type Story = StoryObj<DebounceInputComponent>;

export const Default: Story = {
  args: {
    textValue: 'New Treatment Plan Name',
    title: 'Treatment plan name',
  },
};

export const WithError: Story = {
  args: {
    ...Default,
    title: 'Treatment plan name',
    errorMessage: 'This name already exists',
  },
};

export const NoTitle: Story = {
  args: {
    ...Default,
    title: '',
  },
};

export const TooltipText: Story = {
  args: {
    ...Default,
    textValue: '',
    title: 'Treatment plan name',
    tooltipContent: 'Clicking this does something',
  },
};

export const DisabledInput: Story = {
  args: {
    ...Default,
    textValue: '',
    title: 'Treatment plan name',
    tooltipContent: 'Clicking this does something',
    disabled: true,
  },
};
