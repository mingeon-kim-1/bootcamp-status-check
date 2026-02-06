# Bootcamp Status Check

A real-time bootcamp status monitoring web application built with Next.js, featuring multi-language support and live seat status visualization.

## Features

- **Multi-language Support**: Korean (default), English, and Chinese
- **Real-time Status Display**: Color-coded seat grid (Green=Ready, Red=Need Help, Grey=Absent)
- **Admin Dashboard**: Configure seats, manage students, set daily attendance codes
- **Student Portal**: Login with seat number + attendance code; status control (Ready / Need Help)
- **Fullscreen Mode**: Large display support for classroom monitoring
- **Custom Seat Layout**: Manual seat number assignment with row/column corridors
- **Daily Attendance Codes**: Admin sets morning/afternoon 4-digit codes (KST); students use them to log in
- **Light/Dark Mode**: Automatic system detection with manual override

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (Vercel Postgres)
- **Authentication**: NextAuth.js
- **Internationalization**: next-intl
- **Styling**: Tailwind CSS
- **ORM**: Prisma
- **Real-time**: Polling (status/display refresh every few seconds)

## Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmingeon-kim-1%2Fbootcamp-status-check&env=NEXTAUTH_SECRET&envDescription=Generate%20with%3A%20openssl%20rand%20-base64%2032&stores=%5B%7B%22type%22%3A%22postgres%22%7D%5D)

### Manual Deploy

1. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository

2. **Add Postgres Database**
   - In your Vercel project, go to **Storage** tab
   - Click **Create Database** → **Postgres**
   - Connect it to your project (auto-adds env variables)

3. **Set Environment Variables**
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL`: Your deployment URL (e.g., `https://your-app.vercel.app`)

4. **Deploy & Initialize Database**
   ```bash
   # After first deploy, run from your local machine:
   npx vercel env pull .env.local
   npx prisma db push
   npm run db:seed
   ```

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL database (or use Vercel Postgres)

### Installation

1. Clone the repository

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local`:
   ```
   POSTGRES_PRISMA_URL="postgresql://..."
   POSTGRES_URL_NON_POOLING="postgresql://..."
   NEXTAUTH_SECRET="your-secret-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. Push database schema:
   ```bash
   npx prisma db push
   ```

5. Seed the database:
   ```bash
   npm run db:seed
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## Usage

### Admin Flow

1. Log in at `/admin/login` (default seed: username `admin`, password `wrtnedu`)
2. Configure bootcamp settings (seats per row, total rows, seat direction) in the dashboard
3. Set daily attendance codes (morning / afternoon, 4-digit, KST) for student login
4. Optionally set up custom seat layout at `/admin/seats`
5. View real-time status at `/admin/display` (supports fullscreen)
6. For a shareable display without login, set `DISPLAY_PUBLIC_TOKEN` in the environment and open `/{locale}/view?token=YOUR_SECRET` (e.g. in a projector browser)
7. Manage students at `/admin/students` as needed

### Student Flow

1. Go to `/student/login`
2. Select your seat number and enter the day’s 4-digit attendance code (from the instructor)
3. On successful login you are created or updated; status is set to "Ready" (green)
4. Click "Request Help" to change status to "Need Help" (red)
5. Click "Mark as Ready" when help is received

### Seat Numbering

Default: Bottom-right to top-left (horizontal)

```
Row 3: [9] [8] [7]    <- Top row
Row 2: [6] [5] [4]
Row 1: [3] [2] [1]    <- Bottom row (starts here)
```

Admin can change direction or use custom layout for irregular arrangements.

## Status Colors

| Color | Status | Description |
|-------|--------|-------------|
| 🟢 Green | Ready | Student is online and ready |
| 🔴 Red | Need Help | Student needs assistance (pulses) |
| ⚫ Grey | Absent | Student not logged in |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/status` | Public endpoint for status data (students, config, seat positions) |
| `GET/PUT /api/admin/config` | Bootcamp configuration |
| `GET/PUT /api/admin/attendance` | Daily attendance codes (morning/afternoon) |
| `GET/PUT /api/admin/announcement` | Announcement for students |
| `GET/POST/DELETE /api/admin/seats` | Custom seat positions |
| `GET/PUT/DELETE /api/admin/students` | Student management |
| `GET/PUT /api/student/status` | Student status control (requires auth) |
| `POST/DELETE /api/upload` | Image file upload |

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
npm run db:seed   # Seed database with admin account
npm run db:push   # Push schema to database
```

## Notes

- **Real-time updates**: The display and status views use polling (see `src/lib/socket.ts`). The `socket.io` packages in `package.json` are not used by the app.
- **Seeded admin**: After `npm run db:seed`, log in at `/admin/login` with username `admin` and password `wrtnedu`.
- **Public display**: Set `DISPLAY_PUBLIC_TOKEN` in your environment to enable the view-only URL `/{locale}/view?token=YOUR_SECRET` for projectors or shared screens without admin login.

## License

MIT
