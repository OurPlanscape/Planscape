import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ToolInfoCardComponent } from './tool-info-card.component';

const longDescription =
  'The Treatment Effects module aims to show planners the direct impacts of treatments on their project areas and planning areas, respectively. Through an easy-to-use tool, planners can create any number of treatment scenarios to compare the impacts of their applied treatments and choose the optimal arrangement of treatments that meets their goals for resiliency.';

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
    cardTitle: 'Treatment Effects',
    mainImagePath: '/assets/svg/treatment-effects.svg',
    creditImageAlt: 'Planscape',
    creditImagePath: 'assets/svg/icons/planscape-color-logo-w-text.svg',
    description: longDescription,
  },
};

export const NoMainImage: Story = {
  args: {
    cardTitle: 'Treatment Effects',
    creditImageAlt: 'Planscape',
    creditImagePath: 'assets/svg/icons/planscape-color-logo-w-text.svg',
    description: longDescription,
  },
};

export const NoCreditImage: Story = {
  args: {
    cardTitle: 'Treatment Effects',
    mainImagePath: '/assets/svg/treatment-effects.svg',
    creditText: 'Planscape',
    description: longDescription,
  },
};

export const NoTooltip: Story = {
  args: {
    cardTitle: 'Treatment Effects',
    creditText: 'Planscape',
    description: longDescription,
    showTooltipButton: false,
  },
};

export const DarkTheme: Story = {
  args: {
    cardTitle: 'Treatment Effects',
    creditImageAlt: 'Planscape',
    creditImagePath: 'assets/svg/icons/planscape-color-logo-w-text.svg',
    description: longDescription,
    theme: 'dark',
  },
};

export const WithPartners: Story = {
  args: {
    cardTitle: 'Treatment Effects',
    creditImageAlt: 'Planscape',
    creditImagePath: 'assets/svg/icons/planscape-color-logo-w-text.svg',
    description: longDescription,
    theme: 'dark',
    showTooltipButton: false,
    creditText: 'in partnership with:',
    partners: [
      {
        name: 'Blue Forest',
        logo: '/assets/png/blue-forest.png',
        url: 'https://www.blueforest.org/',
      },
      {
        name: 'The Freshwater Trust',
        logo: '/assets/png/freshwater-trust.png',
        url: 'https://thefreshwatertrust.org/',
      },
    ],
  },
};
