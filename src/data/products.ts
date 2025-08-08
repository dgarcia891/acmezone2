export type Product = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  features: string[];
  tags: string[];
  category: string;
  priceLabel?: string;
  image: string; // path to image (can use public placeholder)
  seoTitle?: string;
  seoDescription?: string;
  type?: string;
};

export const products: Product[] = [
  {
    id: "insightreel",
    name: "InsightReel",
    slug: "insightreel",
    summary:
      "AI-powered Chrome extension that analyzes YouTube videos for tutorials and news.",
    description:
      "InsightReel is a Chrome browser extension that provides AI-powered analysis of YouTube videos. The tool functions by extracting the full text transcript from a video and sending it to an AI service, such as Google Gemini, OpenAI, or Anthropic, using an API key that the user provides in the settings.\n\nThe extension's core features are two comprehensive analysis modes:\n\nTutorial Analysis: This mode evaluates educational or instructional content by generating a variety of metrics, including a Difficulty Score, Truthfulness Score, Viability Score, a step-by-step Workflow Outline, and a list of Required Tools mentioned in the video.\n\nNews Analysis: This mode assesses news and commentary content by generating a Factual Accuracy Score, an Editorial Balance (Bias) Score, a Sensationalism Score, and a detailed, statement-by-statement Fact-Check of claims made in the video.\n\nBoth analysis types also generate an AI summary, a clickbait analysis, and relevant tags. Users can also perform standalone summaries or ask specific questions about the video's content directly from the extension's popup.\n\nAfter an analysis is complete, the results are displayed in the extension's popup interface. Simultaneously, a detailed JSON payload containing all the generated data is sent to a user-configured webhook URL, allowing users to build their own curated database of analyzed videos on their website. To manage submissions, the extension assigns a persistent unique ID to each user and can check the user's website to prevent duplicate analyses.",
    features: [
      "Two analysis modes: Tutorial and News",
      "AI-generated summaries and tags",
      "Clickbait and bias analysis",
      "Webhook delivery of JSON results",
      "User-configurable API key and webhook",
    ],
    tags: ["chrome-extension", "ai", "youtube", "analysis"],
    category: "Extensions",
    priceLabel: "Free trial",
    image: "/placeholder.svg",
    seoTitle: "InsightReel – AI YouTube Video Analysis Chrome Extension",
    seoDescription:
      "Analyze YouTube tutorials and news with AI. Scores, summaries, workflows, and webhook export with InsightReel.",
    type: "Chrome Extension",
  },
  {
    id: "placeholder-app-1",
    name: "Placeholder App One",
    slug: "placeholder-app-one",
    summary: "A sample software card used as a placeholder.",
    description:
      "This is a placeholder product demonstrating the card-based product layout and detail page template. Replace with your real product details later.",
    features: ["Feature A", "Feature B", "Feature C"],
    tags: ["placeholder"],
    category: "Apps",
    priceLabel: "TBD",
    image: "/placeholder.svg",
    seoTitle: "Placeholder App One – Sample Product",
    seoDescription: "Sample product entry used for layout and SEO testing.",
    type: "Web App",
  },
  {
    id: "placeholder-app-2",
    name: "Placeholder App Two",
    slug: "placeholder-app-two",
    summary: "Another sample card to fill the gallery.",
    description:
      "A second placeholder product showcasing consistent design and responsive behavior across devices.",
    features: ["Feature X", "Feature Y"],
    tags: ["placeholder"],
    category: "Apps",
    priceLabel: "TBD",
    image: "/placeholder.svg",
    seoTitle: "Placeholder App Two – Sample Product",
    seoDescription: "Second sample product for gallery population and testing.",
    type: "Web App",
  },
];
