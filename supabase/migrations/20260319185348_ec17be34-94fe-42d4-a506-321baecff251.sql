UPDATE az_products SET
  summary = 'Bridge the Gap Between the Web & Trello. Automatically find existing Trello cards for any webpage, create new ones in seconds, and manage your boards — all without leaving your browser.',
  description = E'Transform how you work with Trello. TrelloBridge creates a seamless connection between your browser and your boards. It automatically scans every page you visit to find matching cards — by URL, page title, ticket ID, or even company name — preventing duplicates and keeping you organized. Need to save something new? Create a detailed card with screenshots and file attachments in seconds, without ever leaving the page.\n\nStop wondering "Did I already save this?" TrelloBridge''s 5-phase search engine checks your boards in real time as you browse. It matches by URL, ticket/job IDs, page title (with fuzzy matching), and even company name — so nothing slips through the cracks. Whether you''re researching a project, recruiting candidates, or tracking bugs, TrelloBridge makes capturing the web effortless.',
  features = ARRAY[
    '🔍 Smart Auto-Discovery — Automatically scans your boards as you browse with color-coded badge indicators',
    '⚡ Lightning-Fast Quick Create — Turn any webpage into a Trello card with one click',
    '📸 Screenshot Capture — Capture and attach screenshots directly from the popup',
    '📎 File Attachments — Attach local files from your computer to cards',
    '💬 Inline Comments — Add comments to any card without opening Trello',
    '🏢 Domain Intelligence — Smart parsers for LinkedIn, Indeed, Glassdoor, and GitHub',
    '🔗 Link Pages to Cards — Link the current page to an existing card with one click',
    '✏️ Full Card Management — Edit titles, move between lists and boards, delete cards',
    '🔎 Manual Search — Search boards by keyword or paste a Trello card URL',
    '🕐 Recent Cards Tray — See recently active cards across all boards',
    '🎯 Optimistic UI — Cards appear in results instantly',
    '⚙️ Fully Configurable — Fuzzy thresholds, auto-check domains, custom ID regex, board filters',
    '🗃️ Search Archived Cards — Include archived cards in search results',
    '💾 Draft Persistence — Form auto-saves and restores on popup reopen'
  ],
  price_label = '$5/month (Free plan available)',
  seo_title = 'TrelloBridge – Chrome Extension for Trello Integration | Acme Zone',
  seo_description = 'Bridge web browsing and Trello! Auto-find existing cards, create new ones instantly, capture screenshots, and manage boards — all without leaving your browser.',
  updated_at = now()
WHERE slug = 'trellobridge';
