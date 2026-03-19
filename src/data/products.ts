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
  images?: string[]; // additional images for carousel
  seoTitle?: string;
  seoDescription?: string;
  type?: string;
  link?: string;
};

export const products: Product[] = [
  // {
  //   id: "pre-apply-ai",
  //   name: "JobGuard Pro (Pre-Apply AI)",
  //   slug: "pre-apply-ai",
  //   summary: "Your LinkedIn Job Application Guardian - Stop wasting time on bad job postings before you even apply!",
  //   description: "JobGuard Pro automatically analyzes LinkedIn job listings in real-time, giving you instant insights into job quality, compensation, and potential red flags. Make smarter career decisions with data-driven job evaluation.\n\n🔍 **Instant Job Analysis**: Automatically scans LinkedIn job postings as you browse with real-time quality assessment and color-coded flags.\n\n🚩 **Smart Red Flag Detection**: Freshness check for stale jobs (30+ days), location flexibility analysis, compensation insights, job description analysis for commission-only/1099 contractor/AI-generated content, and company health indicators.\n\n💡 **Pro Benefits**: Save hours by skipping low-quality jobs, focus on competitive salaries, quickly identify remote opportunities, get one-click access to company reviews and news, and prioritize applications based on quality scores.\n\n🎯 **Perfect For**: Job seekers maximizing success rates, career changers seeking quality opportunities, remote workers, salary negotiators, and busy professionals who can't afford to waste time on bad job posts.\n\n🔒 **Privacy & Security**: 100% client-side analysis with no data collection, works exclusively on LinkedIn, minimal permissions required.",
  //   features: [
  //     "Real-time LinkedIn job quality analysis",
  //     "Smart red flag detection (stale jobs, compensation, location)",
  //     "Company health insights and Glassdoor integration", 
  //     "AI-generated content detection in job posts",
  //     "Color-coded quality indicators",
  //     "One-click company research and news",
  //     "Remote job identification",
  //     "Salary range analysis and compensation insights",
  //     "100% client-side processing for privacy",
  //     "Credit-based premium analysis system"
  //   ],
  //   tags: ["chrome-extension", "linkedin", "job-search", "analysis", "remote-work", "salary-checker"],
  //   category: "Extensions",
  //   priceLabel: "From $10",
  //   image: "/placeholder.svg",
  //   seoTitle: "JobGuard Pro – LinkedIn Job Quality Analyzer Chrome Extension",
  //   seoDescription: "Stop wasting time on bad LinkedIn jobs! Real-time analysis, red flag detection, salary insights, and company research. Make smarter job applications.",
  //   type: "Chrome Extension + Credit System"
  // },
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
    image: "/lovable-uploads/linkedin-job-scanner-hero.png",
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
    id: "trellobridge",
    name: "TrelloBridge",
    slug: "trellobridge",
    summary: "Bridge the Gap Between the Web & Trello. Automatically find existing Trello cards for any webpage, create new ones in seconds, and manage your boards — all without leaving your browser.",
    description: "Transform how you work with Trello. TrelloBridge creates a seamless connection between your browser and your boards. It automatically scans every page you visit to find matching cards — by URL, page title, ticket ID, or even company name — preventing duplicates and keeping you organized. Need to save something new? Create a detailed card with screenshots and file attachments in seconds, without ever leaving the page.\n\n🔍 **Smart Auto-Discovery** — Automatically scans your boards as you browse. The toolbar icon lights up to show matches: **Green badge** = Exact Match found, **Yellow badge** = Possible Match found. No more duplicates.\n\n⚡ **Lightning-Fast Quick Create** — Turn any webpage into a Trello card with one click. Title is pre-filled from the page, description from your highlighted text. Choose board, list, and labels instantly.\n\n📸 **Screenshot Capture** — Capture and attach a screenshot of the visible page to any card — new or existing — directly from the popup. One click, zero hassle.\n\n📎 **File Attachments** — Attach local files from your computer to cards during creation. Drag, drop, done.\n\n💬 **Inline Comments** — Add comments to any card without opening Trello. Highlighted text on the page is automatically suggested as the comment body.\n\n🏢 **Domain Intelligence** — Built-in smart parsers for LinkedIn, Indeed, Glassdoor, and GitHub. Automatically extracts company names, job IDs, ticket numbers, and PR references to find related cards across your boards.\n\n🔗 **Link Pages to Cards** — Found the card you were looking for? Link the current page to an existing card with one click, attaching the URL as a source.\n\n✏️ **Full Card Management** — Edit titles, move between lists and boards, preview descriptions, and delete cards — all from the extension popup. No need to open Trello.\n\n🔎 **Manual Search** — Search your boards by keyword, or paste a Trello card URL to jump directly to it.\n\n🕐 **Recent Cards Tray** — Always see your most recently active cards across all boards, so you can pick up where you left off.\n\n🎯 **Optimistic UI** — Cards appear in your results instantly. No spinners, no waiting for the API.\n\n⚙️ **Fully Configurable** — Set fuzzy match thresholds, configure auto-check domains, strip page title suffixes, add custom ID regex patterns, and filter by specific boards.\n\n🗃️ **Search Archived Cards** — Toggle to include archived cards in your search results when you need to dig up old work.\n\n💾 **Draft Persistence** — Accidentally close the popup mid-creation? Your Quick Create form is auto-saved and restored when you reopen it. Never lose work.\n\n💼 **Perfect For**: Recruiters & HR tracking candidates across LinkedIn, Indeed, and Glassdoor. Project Managers linking Jira tickets and GitHub issues. Content Creators curating research with screenshots. Developers connecting PRs and docs to task cards. Sales Teams tracking prospects. Anyone who wants to stop tab-switching and build a knowledge base in Trello.\n\n💰 **Pricing**: Free plan includes 10 searches/day, 10 card creations/day, 1 screenshot/day, and 1 file attachment/day. Upgrade to Pro ($5/month) for unlimited everything. Secure checkout powered by Stripe.",
    features: [
      "5-phase smart auto-discovery (URL, ticket ID, title, company, recents)",
      "Green/Yellow badge indicators for exact and possible matches",
      "One-click Quick Create with pre-filled title and highlighted text",
      "Screenshot capture and attachment to any card",
      "Local file attachments during card creation",
      "Inline comments with highlighted text auto-fill",
      "Domain intelligence for LinkedIn, GitHub, Indeed, and Glassdoor",
      "One-click page-to-card linking with URL attachment",
      "Full card management (edit, move lists/boards, delete)",
      "Manual keyword search and direct Trello URL lookup",
      "Recent Cards tray showing latest activity across boards",
      "Search archived cards toggle",
      "Draft persistence — auto-saves and restores Quick Create forms",
      "Configurable fuzzy match thresholds and custom ID regex patterns",
      "Auto-check domains for favorite sites",
      "Optimistic UI with instant card rendering"
    ],
    tags: ["chrome-extension", "trello", "productivity", "project-management", "organization", "workflow", "automation", "task-management", "screenshots", "recruiting"],
    category: "Extensions",
    priceLabel: "$5/month",
    image: "/lovable-uploads/ff84c184-f45b-4bef-ae67-83422faff51b.png",
    images: [
      "/lovable-uploads/ff84c184-f45b-4bef-ae67-83422faff51b.png",
      "/lovable-uploads/0bc8bf7c-eee5-4bbc-a87d-684fa5ca0f00.png"
    ],
    seoTitle: "TrelloBridge – Smart Trello Chrome Extension | Auto-Find Cards, Screenshots & More",
    seoDescription: "Automatically find existing Trello cards for any webpage, create new ones with screenshots, and manage boards from your browser. Free plan available, Pro at $5/month.",
    type: "Chrome Extension"
  },
  {
    id: "chrome-extension-image-editor",
    name: "Chrome Extension Image Editor",
    slug: "chrome-extension-image-editor",
    summary: "Professional icon formatter for Chrome extension submissions with automatic background removal.",
    description: "Chrome Extension Image Editor is a powerful web app designed specifically for Chrome extension developers. Upload any image and automatically format it to meet Chrome Web Store requirements with professional background removal and multiple size outputs.\n\n🎨 **Automatic Formatting**: Instantly converts images to required Chrome extension icon sizes (16x16, 48x48, 128x128 pixels) with perfect PNG formatting and transparent backgrounds.\n\n✨ **AI Background Removal**: Advanced AI technology removes backgrounds automatically while preserving image quality and fine details for professional-looking icons.\n\n📦 **Multiple Size Export**: Download all required icon sizes in one click, properly formatted for Chrome extension manifest files with consistent quality across all sizes.\n\n🎯 **Developer-Focused**: Built specifically for Chrome extension developers who need compliant icons fast, with automatic optimization and quality preservation.\n\n⚡ **Instant Processing**: Upload and process images in seconds with no quality loss, saving developers hours of manual image editing and formatting.",
    features: [
      "Automatic Chrome extension icon formatting",
      "AI-powered background removal",
      "Multiple size outputs (16x16, 48x48, 128x128)",
      "PNG format with transparency",
      "Quality preservation during conversion",
      "One-click download of all sizes",
      "Chrome Web Store compliance",
      "No manual editing required",
      "Instant processing",
      "Professional results"
    ],
    tags: ["web-app", "chrome-extension", "image-processing", "ai", "developer-tools", "icons"],
    category: "Tools",
    priceLabel: "Free",
    image: "/lovable-uploads/chrome-extension-image-editor-hero.png",
    seoTitle: "Chrome Extension Image Editor – Automatic Icon Formatter with Background Removal",
    seoDescription: "Format images for Chrome extension icons with AI background removal. Get all required sizes instantly with perfect transparency.",
    type: "Web App"
  },
  {
    id: "background-remover",
    name: "Background Remover",
    slug: "background-remover",
    summary: "Free AI-powered background removal tool - runs entirely in your browser for complete privacy.",
    description: "Background Remover is a powerful, privacy-focused web app that removes backgrounds from your images using AI technology. Everything runs locally in your browser - no uploads, no servers, complete privacy.\n\n✨ **AI-Powered Processing**: Advanced machine learning models remove backgrounds with professional quality, preserving fine details like hair, fur, and complex edges while maintaining image quality.\n\n🔒 **100% Private**: All processing happens in your browser with no data sent to servers, complete privacy for sensitive images, no accounts or sign-ups required, and instant processing without uploads.\n\n🎨 **Perfect Results**: Side-by-side comparison view to see your results, transparent PNG output for versatile use, works with logos, product photos, portraits, and graphics, with professional quality for e-commerce and marketing.\n\n⚡ **Fast & Free**: Process images in seconds with 3 free uses per day, no credit card required, no watermarks, and unlimited downloads of your processed images.\n\n📦 **Easy to Use**: Drag and drop or click to upload with support for JPG, PNG, JPEG, and WebP formats, instant preview of results, and one-click download of transparent PNG files.\n\n🎯 **Perfect For**: E-commerce sellers creating product images, graphic designers preparing assets, content creators making thumbnails, social media marketers, and anyone who needs transparent images fast!",
    features: [
      "AI-powered background removal",
      "100% browser-based processing (no uploads)",
      "Complete privacy - no data sent to servers",
      "Side-by-side before/after comparison",
      "Transparent PNG output",
      "High-quality edge detection",
      "Works with portraits, products, logos, and graphics",
      "3 free uses per day",
      "No watermarks or sign-ups",
      "Instant processing and download"
    ],
    tags: ["web-app", "ai", "image-processing", "background-removal", "free", "privacy"],
    category: "Tools",
    priceLabel: "Free",
    image: "/lovable-uploads/background-remover-hero.png",
    seoTitle: "Background Remover – Free AI Background Removal Tool",
    seoDescription: "Remove backgrounds from images instantly with AI. 100% private, browser-based processing. Perfect for products, logos, and portraits. 3 free uses daily.",
    type: "Web App",
    link: "/background-remover"
  }
];
