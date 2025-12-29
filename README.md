# PhysioHelper React

A physiotherapy workout tracker built with Next.js 14, TypeScript, Prisma, and Tailwind CSS.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npm run db:push
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database

This project uses SQLite with Prisma ORM. The database schema includes:
- **Exercise**: Stores exercise definitions
- **WorkoutSet**: Tracks individual workout sets

### Important: Date/Time Handling

🚨 **ALWAYS use local time - NEVER use UTC or ISO dates!**

All dates in the database are stored as local datetime strings (YYYY-MM-DD HH:MM:SS).

Always import and use the utilities from `lib/utils/dateUtils.ts`:

```typescript
import { getLocalDateTime, parseLocalDateTime } from '@/lib/utils/dateUtils';

// Get current time
const now = getLocalDateTime();

// Parse a date string
const date = parseLocalDateTime(dateString);
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio
