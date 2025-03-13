import { Meta, moduleMetadata, StoryObj } from '@storybook/angular';
import { FormsModule } from '@angular/forms';
import { HighlighterDirective } from './highlighter.directive';

interface StoryProps {
  searchTerm?: string;
}

const meta: Meta<StoryProps> = {
  title: 'Components/Highlighter',
  // For autodocs, we can still reference the directive as the "component",
  // but we must also properly import it below.
  component: HighlighterDirective,
  decorators: [
    moduleMetadata({
      imports: [HighlighterDirective, FormsModule],
    }),
  ],
};

export default meta;

// Create a Story type
type Story = StoryObj<StoryProps>;

export const Default: Story = {
  render: () => ({
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
