

# Remove Exposed Emails & Add CAPTCHA to Forms

## Overview
Remove all plaintext email addresses from the site to prevent scraping by spammers/crawlers. Replace "mailto:" links with links to the Contact page. Add a simple math-based CAPTCHA challenge to the Contact form that must be solved before the Submit button appears.

## Changes

### 1. Remove emails from Support page
**File:** `src/pages/Support.tsx`
- Replace `<a href="mailto:support@acme.zone">Contact Support</a>` with `<Link to="/contact">Contact Support</Link>` (two instances)
- Remove any visible email text from the page
- The "Email Support" card and "Still Need Help" section both route to the Contact form instead

### 2. Add math CAPTCHA to Contact form
**File:** `src/pages/Contact.tsx`
- Generate a random simple math problem on mount (e.g., "What is 7 + 4?")
- Add a new input field where the user types the answer
- The Submit button remains hidden/disabled until the correct answer is entered
- Regenerate the problem after each successful submission
- Keep the existing honeypot field as an additional layer

**CAPTCHA behavior:**
- On component mount: pick two random numbers (1-20), store the expected sum
- Display: "What is X + Y?" with an input field
- When the user types the correct answer, the Submit button fades in
- Wrong/empty answer: Submit button stays hidden, no error shown (to avoid giving bots feedback)

### 3. Support page update (from prior approved plan)
Since we're already modifying Support.tsx, this will also be combined with the approved plan to restructure it into a general Acme Zone support page with per-product FAQ sections.

---

## Technical Details

### Files changed
| Action | File |
|--------|------|
| Modify | `src/pages/Support.tsx` -- remove mailto links, restructure as Acme Zone support hub |
| Modify | `src/pages/Contact.tsx` -- add math CAPTCHA, hide submit until solved |

### CAPTCHA implementation
```text
State:
  captchaA: number (1-20)
  captchaB: number (1-20)
  captchaAnswer: string (user input)
  captchaSolved: boolean (computed: parseInt(answer) === a + b)

UI:
  [Label] "Quick check: What is {a} + {b}?"
  [Input] number field
  [Submit button] only rendered when captchaSolved is true
```

No external dependencies needed -- pure React state with random number generation via `Math.random()`.

### No database changes required

