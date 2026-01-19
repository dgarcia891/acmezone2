---
description: 🚀 Safe deployment gate (Tests + Version Bump)
---
# 🚀 Deployment Gate

1. **Status:** Check git status. Must be clean.
2. **Gate:** Run npm run test (or equivalent). **STOP IF FAIL.**
3. **Version:** Check package.json. Has it been bumped?
4. **Push:** Execute git push.
