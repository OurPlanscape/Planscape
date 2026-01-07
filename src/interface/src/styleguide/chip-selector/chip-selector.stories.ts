import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import { ChipSelectorComponent } from './chip-selector.component';

const meta: Meta<ChipSelectorComponent> = {
  title: 'Components/Chip Selector',
  component: ChipSelectorComponent,
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `
    <div style='width: 400px; padding: 20px;  border: 1px solid #d0d0d0; resize: both;'>
    <sg-chip-selector ${argsToTemplate(args)}></sg-chip-selector>
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<ChipSelectorComponent>;

const items: string[] = [
  'Quantum Synergy',
  'Cognitive Resonance',
  'Transdimensional Pedagogy',
  'Neuromorphic Ontology',
  'Meta-analytical Ethnography',
  'Holistic Epistemology',
  'Chrono-ecological Paradigm',
  'Dialectic Assimilation',
  'Post-structural Biophysics',
];

export const Default: Story = {
  args: {
    items: items,
  },
};

export const NoItems: Story = {
  args: {
    items: [],
  },
};

export const NoOverageItems: Story = {
  args: {
    items: [
      'Intertextual Morphology',
      'Cultural Homogeneity Framework',
      'Synthetic Ecology',
      'Post-futuristic Narratives',
    ],
    maxCollapsedItems: 4,
  },
};

export const LotsOfItems: Story = {
  args: {
    items: [
      'Quantum Synergy',
      'Cognitive Resonance',
      'Transdimensional Pedagogy',
      'Neuromorphic Ontology',
      'Meta-analytical Ethnography',
      'Holistic Epistemology',
      'Chrono-ecological Paradigm',
      'Dialectic Assimilation',
      'Post-structural Biophysics',
      'Simulated Discourse Analysis',
      'Intertextual Morphology',
      'Cultural Homogeneity Framework',
      'Synthetic Ecology',
      'Post-futuristic Narratives',
      'Digital Ethos',
      'Radical Constructivism',
      'Hyperreal Cognition',
      'Ephemeral Architecture',
      'Multimodal Hypertextuality',
      'Axis of Complexity',
      'Transcendental Transference',
      'Structural Nihilism',
      'Recursive Hermeneutics',
      'Philosophical Cartography',
      'Virtual Archeology',
      'Integrative Semiotics',
      'Affective Dynamics',
      'Biocultural Transition',
      'Preemptive Ethnography',
      'Cosmological Linguistics',
      'Embodied Metrics',
      'Paradoxical Pedagogy',
      'Sonic Ontogeny',
      'Epistemic Framing',
      'Rhizomatic Analysis',
      'Informatic Epiphany',
      'Chrono-critical Studies',
      'Futuristic Liminality',
      'Collective Cognitive Dissonance',
      'Simulacra Discourse',
      'Adaptive Ethos',
      'Transgressive Narratives',
      'Nonlinear Perception',
      'Theoretical Deconstruction',
      'Radical Interdependence',
      'Symbolic Cartography',
      'Interdisciplinary Aggregation',
      'Meta-narrative Constructs',
      'Exospheric Dynamics',
      'Cognitive Topology',
      'Fluid Ontological Structures',
      'Causal Complexity',
      'Imagined Geographies',
      'Sociotechnical Synergy',
      'Phenomenological Inquiry',
      'Virtual Epistemology',
      'Transitory Discourse',
      'Ecosystemic Paradigms',
      'Recursive Cultural Analysis',
      'Neoliberal Hermeneutics',
    ],
    maxCollapsedItems: 4,
  },
};
