# Bootcamp Status Check

A real-time bootcamp status monitoring web application built with Next.js, featuring multi-language support and live seat status visualization.

## Features

- **Multi-language Support**: Korean (default), English, and Chinese
- **Real-time Status Display**: Color-coded seat grid (Green=Ready, Red=Need Help, Grey=Absent)
- **Admin Dashboard**: Configure seats, manage students, customize branding
- **Student Portal**: Easy sign-up and status control
- **Fullscreen Mode**: Large display support for classroom monitoring
- **Custom Seat Layout**: Manual seat number assignment for irregular arrangements
- **Organization Branding**: Upload logos and customize text for login/display screens

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js
- **Internationalization**: next-intl
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   npx prisma migrate dev
   npm run db:seed
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Usage

### Admin Flow

1. Log in at `/admin/login` with admin credentials
2. Configure bootcamp settings (seats per row, total rows, seat direction)
3. Optionally set up custom seat layout at `/admin/seats`
4. Upload organization branding at `/admin/branding`
5. View real-time status at `/admin/display` (supports fullscreen)
6. Manage students and reset accounts as needed

### Student Flow

1. Sign up at `/student/signup` with email and seat number
2. Log in at `/student/login`
3. Status automatically set to "Ready" (green) on login
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
| `GET /api/status` | Public endpoint for real-time status data |
| `GET/PUT /api/admin/config` | Bootcamp configuration |
| `GET/PUT /api/admin/branding` | Organization branding |
| `GET/POST/DELETE /api/admin/seats` | Custom seat positions |
| `GET/PUT/DELETE /api/admin/students` | Student management |
| `POST /api/student/signup` | Student registration |
| `GET/PUT /api/student/status` | Student status control |
| `POST/DELETE /api/upload` | Image file upload |

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run db:seed  # Seed database with admin account
npm run db:reset # Reset database
```

## License

MIT
