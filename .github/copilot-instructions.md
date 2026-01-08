# PhysioHelper React - Project Instructions

## Project Overview
A physiotherapy workout tracker built with Next.js 14, TypeScript, Prisma, and Tailwind CSS.

## Critical Rules

### Date/Time Handling
🚨 **ALWAYS use local time - NEVER use UTC or ISO dates!**

All dates in the database are stored as local datetime strings (YYYY-MM-DD HH:MM:SS).

⚠️ **CRITICAL: Client-side must always provide dates to avoid timezone mismatches!**

**On the CLIENT (Frontend):**
```typescript
// ✅ CORRECT - Client generates and sends date to server:
import { getLocalDateTime, getLocalDate } from '@/lib/utils/dateUtils';

// When logging a session:
const completedAt = getLocalDateTime();
await fetch('/api/exercises/${id}/sessions', {
  method: 'POST',
  body: JSON.stringify({ ...data, completedAt })
});

// When checking for today's session:
const todayDate = getLocalDate();
await fetch(`/api/exercises/${id}/sessions/today?date=${todayDate}`);
```

**On the SERVER (API Routes):**
```typescript
// ✅ CORRECT - Accept date from client, fallback only if not provided:
import { getLocalDateTime } from '@/lib/utils/dateUtils';

const { completedAt } = await request.json();
const finalDate = completedAt || getLocalDateTime(); // Fallback for backwards compatibility

// For "today" checks, accept date parameter from client:
const { searchParams } = new URL(request.url);
const clientDate = searchParams.get('date') || getLocalDate();
```

```typescript
// ❌ WRONG - Never do this:
const now = new Date().toISOString();
const date = new Date(dateString);

// ❌ WRONG - Server generating dates without client input:
const now = getLocalDateTime(); // Only use as fallback!
```

See [dateUtils.ts](lib/utils/dateUtils.ts) for all available utilities.

## Checklist
- [x] Verify copilot-instructions.md file created
- [ ] Scaffold Next.js project
- [ ] Set up Prisma with database schema
- [ ] Create date utilities
- [ ] Build core features
- [ ] Test application
