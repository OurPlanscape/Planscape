import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import { TileButtonComponent } from '@styleguide/tile-button/tile-button.component';

type PagePropsAndCustomArgs = TileButtonComponent & { content?: string };

/**
 * Tile buttons are used to display actionable items with an image background and text overlay.
 * They are commonly used for analytics tools entry buttons and card-style buttons.
 */
const meta: Meta<PagePropsAndCustomArgs> = {
  title: 'Components/Tile Button',
  component: TileButtonComponent,
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-tile-button ${argsToTemplate(args)}></sg-tile-button>`,
  }),
};

export default meta;
type Story = StoryObj<PagePropsAndCustomArgs>;

export const Default: Story = {
  args: {
    title: 'Climate Foresight',
    subtitle: 'Integrate climate data...',
    backgroundImage: 'https://picsum.photos/200/200',
    size: 'md',
  },
};

export const WithoutSubtitle: Story = {
  args: {
    title: 'Forest Analytics',
    backgroundImage: 'https://picsum.photos/200/200',
    size: 'md',
  },
};

export const Disabled: Story = {
  args: {
    title: 'Coming Soon',
    subtitle: 'This feature is not yet available',
    backgroundImage: 'https://picsum.photos/200/200',
    disabled: true,
    size: 'md',
  },
};

export const MultipleTools: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 16px; flex-wrap: wrap; max-width: 600px;">
        <sg-tile-button
          title="Climate Foresight"
          subtitle="Integrate climate data..."
          backgroundImage="https://picsum.photos/200/200"
          size="md">
        </sg-tile-button>
        <sg-tile-button
          title="Wildlife Corridors"
          subtitle="Analyze habitat connectivity"
          backgroundImage="https://picsum.photos/200/200"
          size="md">
        </sg-tile-button>
        <sg-tile-button
          title="Fire Risk Assessment"
          subtitle="Evaluate wildfire potential"
          backgroundImage="https://picsum.photos/200/200"
          size="md">
        </sg-tile-button>
        <sg-tile-button
          title="Water Resources"
          subtitle="Coming soon"
          backgroundImage="https://picsum.photos/200/200"
          disabled="true"
          size="md">
        </sg-tile-button>
      </div>
    `,
  }),
};

export const Interactive: Story = {
  args: {
    title: 'Click Me!',
    subtitle: 'See console for click events',
    backgroundImage: 'https://picsum.photos/200/200',
    size: 'md',
  },
  render: ({ ...args }) => ({
    props: {
      ...args,
    },
    template: `
      <sg-tile-button
        ${argsToTemplate(args)}
        (tileClick)="handleClick()">
      </sg-tile-button>
    `,
  }),
};

export const GridLayout: Story = {
  render: () => ({
    template: `
      <div style="padding: 20px; background-color: #f5f5f5;">
        <h3 style="margin-bottom: 16px; font-family: sans-serif;">Planning Area Analytics Tools</h3>
        <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: space-between; max-width: 380px;">
          <sg-tile-button
            title="Climate Foresight"
            subtitle="Integrate climate data..."
            backgroundImage="https://picsum.photos/200/200"
            size="md">
          </sg-tile-button>
          <sg-tile-button
            title="Wildlife Corridors"
            subtitle="Analyze habitat connectivity"
            backgroundImage="https://picsum.photos/200/200"
            size="md">
          </sg-tile-button>
        </div>
      </div>
    `,
  }),
};
