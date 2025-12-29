# PhysioHelper React - Project Instructions

## Project Overview
A physiotherapy workout tracker built with Next.js 14, TypeScript, Prisma, and Tailwind CSS.

## Critical Rules

### Date/Time Handling
🚨 **ALWAYS use local time - NEVER use UTC or ISO dates!**

All dates in the database are stored as local datetime strings (YYYY-MM-DD HH:MM:SS).

```typescript
// ❌ WRONG - Never do this:
const now = new Date().toISOString();
const date = new Date(dateString);

// ✅ CORRECT - Always use utilities from lib/utils/dateUtils.ts:
import { getLocalDateTime, parseLocalDateTime } from '@/lib/utils/dateUtils';
const now = getLocalDateTime();
const date = parseLocalDateTime(dateString);
```

See dateUtils.ts for all available utilities.

## Checklist
- [x] Verify copilot-instructions.md file created
- [ ] Scaffold Next.js project
- [ ] Set up Prisma with database schema
- [ ] Create date utilities
- [ ] Build core features
- [ ] Test application
