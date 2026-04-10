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
    title: 'Treatment Effects',
    mainImagePath: '/assets/svg/treatment-effects.svg',
    creditImageAlt: 'Planscape',
    creditImagePath: 'assets/svg/icons/planscape-color-logo-w-text.svg',
    description:
      'The Treatment Effects module aims to show planners the direct impacts of treatments on their project areas and planning areas, respectively. Through an easy-to-use tool, planners can create any number of treatment scenarios to compare the impacts of their applied treatments and choose the optimal arrangement of treatments that meets their goals for resiliency.',
  },
};

export const NoMainImage: Story = {
  args: {
    title: 'Treatment Effects',
    creditImageAlt: 'Planscape',
    creditImagePath: 'assets/svg/icons/planscape-color-logo-w-text.svg',
    description:
      'The Treatment Effects module aims to show planners the direct impacts of treatments on their project areas and planning areas, respectively. Through an easy-to-use tool, planners can create any number of treatment scenarios to compare the impacts of their applied treatments and choose the optimal arrangement of treatments that meets their goals for resiliency.',
  },
};

export const NoCreditImage: Story = {
  args: {
    title: 'Treatment Effects',
    mainImagePath: '/assets/svg/treatment-effects.svg',
    creditText: 'Planscape',
    description:
      'The Treatment Effects module aims to show planners the direct impacts of treatments on their project areas and planning areas, respectively. Through an easy-to-use tool, planners can create any number of treatment scenarios to compare the impacts of their applied treatments and choose the optimal arrangement of treatments that meets their goals for resiliency.',
  },
};
