import { Meta, moduleMetadata, StoryObj } from '@storybook/angular';
import { FormsModule } from '@angular/forms';
import { HighlighterDirective } from './highlighter.directive';

// We no longer need an interface for "content" because it's static now.
interface StoryProps {
  // We'll store the search term here
  searchTerm?: string;
}

const meta: Meta<StoryProps> = {
  title: 'Components/Highlighter',

  // For autodocs, we can still reference the directive as the "component",
  // but we must also properly import it below.
  component: HighlighterDirective,

  decorators: [
    moduleMetadata({
      // For a standalone directive + ngModel usage, we need both:
      imports: [HighlighterDirective, FormsModule],
    }),
  ],
};

// This default export is required by Storybook
export default meta;

// Create a Story type
type Story = StoryObj<StoryProps>;

export const Default: Story = {
  // Instead of a function that returns "args" => we can do a simpler approach
  render: () => ({
    // We'll keep the searchTerm in local props. Start blank or with default text
    props: { searchTerm: '' },

    template: `
      <div style='display: flex; align-items: center; margin-bottom: 10px; gap: 8px;'>
        <label for='searchInput'>Search term:</label>
        <input
          id='searchInput'
          [(ngModel)]='searchTerm'
          placeholder='Type something to highlight'
          style='padding: 5px; width: 400px;'
        />
      </div>

      <p [sgHighlighter]='searchTerm'>
        Planscape is a free, open source decision support tool designed to help
        teams doing wildland planning identify the optimal areas on their landscape
        to treat for wildfire resilience.
      </p>
      <div style='display: grid; grid-template-columns: 32px 1fr; gap: 8px;'>
      <input type='radio'><label [sgHighlighter]='searchTerm'>Annual Burn Probability</label>
      <input type='radio'><label [sgHighlighter]='searchTerm'>Probability of Fire Severity (High)</label>
      <input type='radio'><label [sgHighlighter]='searchTerm'>Wildfire Hazard Potential</label>
      </div>
    `,
  }),
};
