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
  link?: string;
};

export const products: Product[] = [
  {
    id: "pre-apply-ai",
    name: "JobGuard Pro (Pre-Apply AI)",
    slug: "pre-apply-ai",
    summary: "Your LinkedIn Job Application Guardian - Stop wasting time on bad job postings before you even apply!",
    description: "JobGuard Pro automatically analyzes LinkedIn job listings in real-time, giving you instant insights into job quality, compensation, and potential red flags. Make smarter career decisions with data-driven job evaluation.\n\n🔍 **Instant Job Analysis**: Automatically scans LinkedIn job postings as you browse with real-time quality assessment and color-coded flags.\n\n🚩 **Smart Red Flag Detection**: Freshness check for stale jobs (30+ days), location flexibility analysis, compensation insights, job description analysis for commission-only/1099 contractor/AI-generated content, and company health indicators.\n\n💡 **Pro Benefits**: Save hours by skipping low-quality jobs, focus on competitive salaries, quickly identify remote opportunities, get one-click access to company reviews and news, and prioritize applications based on quality scores.\n\n🎯 **Perfect For**: Job seekers maximizing success rates, career changers seeking quality opportunities, remote workers, salary negotiators, and busy professionals who can't afford to waste time on bad job posts.\n\n🔒 **Privacy & Security**: 100% client-side analysis with no data collection, works exclusively on LinkedIn, minimal permissions required.",
    features: [
      "Real-time LinkedIn job quality analysis",
      "Smart red flag detection (stale jobs, compensation, location)",
      "Company health insights and Glassdoor integration", 
      "AI-generated content detection in job posts",
      "Color-coded quality indicators",
      "One-click company research and news",
      "Remote job identification",
      "Salary range analysis and compensation insights",
      "100% client-side processing for privacy",
      "Credit-based premium analysis system"
    ],
    tags: ["chrome-extension", "linkedin", "job-search", "analysis", "remote-work", "salary-checker"],
    category: "Extensions",
    priceLabel: "From $10",
    image: "/placeholder.svg",
    seoTitle: "JobGuard Pro – LinkedIn Job Quality Analyzer Chrome Extension",
    seoDescription: "Stop wasting time on bad LinkedIn jobs! Real-time analysis, red flag detection, salary insights, and company research. Make smarter job applications.",
    type: "Chrome Extension + Credit System"
  },
  {
    id: "linkedin-job-scanner",
    name: "LinkedIn Job Scanner",
    slug: "linkedin-job-scanner",
    summary: "Advanced LinkedIn job search and analysis tool with automated scanning capabilities.",
    description: "LinkedIn Job Scanner is a powerful Chrome extension that automatically scans and analyzes LinkedIn job postings to help you find the perfect opportunities faster. With advanced filtering, real-time notifications, and comprehensive job analysis, make your job search more efficient and targeted.\n\n🔍 **Advanced Scanning**: Automatically scan LinkedIn for new job postings matching your criteria with customizable filters for location, salary, experience level, and company size.\n\n⚡ **Real-time Alerts**: Get instant notifications when new jobs matching your preferences are posted, giving you a competitive advantage in applying early.\n\n📊 **Job Analytics**: Track application success rates, analyze job market trends, and get insights into the most promising opportunities in your field.\n\n🎯 **Smart Filtering**: Advanced search capabilities beyond LinkedIn's native filters, including company culture keywords, benefits analysis, and role progression potential.\n\n🤖 **Automated Actions**: Set up automated job applications for roles that meet your exact criteria, with customizable application templates and follow-up reminders.",
    features: [
      "Automated LinkedIn job scanning and monitoring",
      "Real-time job posting notifications",
      "Advanced filtering beyond LinkedIn's native options",
      "Job market analytics and trend analysis",
      "Application tracking and success rate monitoring",
      "Automated application submission with templates",
      "Company culture and benefits analysis",
      "Salary range detection and comparison",
      "Role progression and career path insights",
      "Custom alert configurations and preferences"
    ],
    tags: ["chrome-extension", "linkedin", "job-search", "automation", "analytics", "notifications"],
    category: "Extensions",
    priceLabel: "From $15",
    image: "/lovable-uploads/77e104a6-6780-4226-8a1e-f7bdac09fc40.png",
    seoTitle: "LinkedIn Job Scanner – Automated Job Search Chrome Extension",
    seoDescription: "Automate your LinkedIn job search with advanced scanning, real-time alerts, and job analytics. Find opportunities faster with smart filtering.",
    type: "Chrome Extension"
  },
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
    image: "https://cdn.zappy.app/e2a1dca18003b3529eb8ef58629649a6.png",
    seoTitle: "InsightReel – AI YouTube Video Analysis Chrome Extension",
    seoDescription:
      "Analyze YouTube tutorials and news with AI. Scores, summaries, workflows, and webhook export with InsightReel.",
    type: "Chrome Extension",
    link: "https://chrome.google.com/webstore/detail/ijjmnphgdcidmeolmgijnohocebdhfhg",
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
