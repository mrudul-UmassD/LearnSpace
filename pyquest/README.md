# PyQuest 🐍✨

PyQuest is a production-grade web application for learning Python through interactive quests and a visual game map. Built with Next.js, TypeScript, Tailwind CSS, and PostgreSQL.

## 🚀 Features

- **Interactive Quests**: Learn Python through hands-on coding challenges
- **Quest Map**: Visual representation of your learning journey
- **Progress Tracking**: Track your XP, achievements, and completed quests
- **Multiple Difficulty Levels**: Beginner, Intermediate, and Advanced quests
- **Clean UI**: Modern, responsive design with Tailwind CSS
- **Type-Safe**: Full TypeScript support throughout the application
- **Database-Backed**: PostgreSQL with Prisma ORM for data persistence

## 📁 Project Structure

```
pyquest/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Home page
│   ├── quests/              # Quest listing and detail pages
│   ├── map/                 # Interactive quest map
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── ui/                  # Reusable UI components (Button, Card, etc.)
│   ├── quest/               # Quest-specific components
│   └── map/                 # Map-related components
├── content/                 # Quest content and data
│   └── quests/              # Quest definitions
├── lib/                     # Utility functions and services
│   ├── db/                  # Database configuration
│   ├── services/            # Business logic services
│   └── utils/               # Helper utilities
├── prisma/                  # Prisma schema and migrations
│   └── schema.prisma        # Database schema
├── types/                   # TypeScript type definitions
└── public/                  # Static assets
```

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Code Quality**: ESLint + Prettier

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or later
- **npm** or **yarn** package manager
- **PostgreSQL** 14.x or later

## 🚦 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd pyquest
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file and update it with your database credentials:

```bash
cp .env.example .env
```

Edit `.env` and update the `DATABASE_URL`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/pyquest?schema=public"
```

Replace `USER` and `PASSWORD` with your PostgreSQL credentials.

### 4. Set Up the Database

Create the PostgreSQL database:

```bash
# Using psql
createdb pyquest

# Or using PostgreSQL command line
psql -U postgres
CREATE DATABASE pyquest;
\q
```

Generate Prisma Client and run migrations:

```bash
npx prisma generate
npx prisma db push
```

### 5. (Optional) Seed the Database

To populate the database with sample quests:

```bash
npx prisma db seed
```

### 6. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🎮 Usage

### Running the Application

- **Development Mode**: `npm run dev`
- **Build for Production**: `npm run build`
- **Start Production Server**: `npm start`
- **Lint Code**: `npm run lint`
- **Format Code**: `npx prettier --write .`

### Database Management

- **Open Prisma Studio**: `npx prisma studio`
- **Generate Prisma Client**: `npx prisma generate`
- **Push Schema Changes**: `npx prisma db push`
- **Create Migration**: `npx prisma migrate dev --name migration_name`

## 🎯 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Open Prisma Studio GUI |
| `npx prisma generate` | Generate Prisma Client |
| `npx prisma db push` | Push schema to database |

## 📝 Adding New Quests

To add new quests, edit or create files in `content/quests/`:

```typescript
export const questsData = [
  {
    id: 'quest-id',
    title: 'Quest Title',
    description: 'Quest description',
    difficulty: 'beginner', // 'beginner' | 'intermediate' | 'advanced'
    category: 'category-name',
    order: 1,
    xpReward: 100,
    isPublished: true,
    challenges: [
      {
        title: 'Challenge Title',
        description: 'Challenge description',
        starterCode: '# Write your code here\n',
        solution: 'print("Hello, World!")',
        testCases: [
          {
            input: '',
            expectedOutput: 'Hello, World!',
            description: 'Test description',
          },
        ],
        hints: ['Hint 1', 'Hint 2'],
        order: 1,
      },
    ],
  },
];
```

## 🔧 Configuration

### ESLint & Prettier

ESLint and Prettier are configured to work together. Configuration files:

- `.eslintrc.json` - ESLint rules
- `.prettierrc` - Prettier formatting rules

### Tailwind CSS

Tailwind is configured in `tailwind.config.ts`. Custom utilities are available in `lib/utils/`.

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add environment variables in the Vercel dashboard
4. Deploy!

### Other Platforms

PyQuest can be deployed to any platform that supports Next.js:

- **Railway**: [Deploy to Railway](https://railway.app)
- **Render**: [Deploy to Render](https://render.com)
- **AWS**: Use AWS Amplify or EC2
- **Docker**: Use the included Dockerfile (if added)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Database powered by [Prisma](https://www.prisma.io/)

---

**Happy Coding! 🎉**


This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
