

# Fix 3 Genuine Gaps from Audit

## Changes

### 1. `index.html` — Add favicon link + robots meta
Add two tags to `<head>`:
```html
<link rel="icon" href="/favicon.ico" type="image/x-icon" />
<meta name="robots" content="index, follow" />
```

### 2. `src/components/layout/Footer.tsx` — Add social links
Add a 4th column (or row) with social media links. Will need to know which platforms to include — defaulting to placeholder icons for Twitter/X and GitHub with `rel="noopener noreferrer"` and `target="_blank"`.

## Scope
- 2 files, ~10 lines changed total
- No backend changes needed

