# 🚀 PyQuest - Quick Start Guide

## ✅ Project is Ready!

Your PyQuest application has been successfully set up and is ready to run.

## 📁 Location
```
c:\Users\MRUDUL\Desktop\Projects\Project 3\LearnSpace\pyquest
```

## 🏃 Start the Application

### Option 1: PowerShell (Recommended)
```powershell
cd "c:\Users\MRUDUL\Desktop\Projects\Project 3\LearnSpace\pyquest"
npm run dev
```

### Option 2: VS Code Terminal
1. Open the `pyquest` folder in VS Code
2. Open a terminal (Ctrl + `)
3. Run: `npm run dev`

### Option 3: Use the Setup Script
```powershell
.\setup.ps1
```

## 🌐 Access the Application

Once the server starts (it takes about 2-3 seconds), open your browser to:

- **Local**: http://localhost:3000
- **Network**: http://192.168.68.91:3000

## ✨ What's Included

### Pages
- **Home** (`/`) - Beautiful landing page with hero section
- **Quests** (`/quests`) - Browse all Python learning quests
- **Map** (`/map`) - Quest map (placeholder for future interactive map)

### Sample Content
- 3 beginner quests with challenges
- Python basics, variables, and control flow topics
- Sample test cases and hints

## 🗄️ Database Setup (Optional)

If you want to use the database features:

1. **Install PostgreSQL** (if not already installed)

2. **Create the database:**
   ```powershell
   createdb pyquest
   # Or using psql:
   psql -U postgres -c "CREATE DATABASE pyquest;"
   ```

3. **Update `.env` file** with your database credentials:
   ```env
   DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/pyquest?schema=public"
   ```

4. **Push the schema to the database:**
   ```powershell
   npm run prisma:push
   ```

5. **Open Prisma Studio** (optional - to view/edit data):
   ```powershell
   npm run prisma:studio
   ```

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:push` | Push schema to database |
| `npm run prisma:studio` | Open Prisma Studio |

## 🎯 Build Status

- ✅ TypeScript compilation successful
- ✅ Production build working
- ✅ No ESLint errors
- ✅ Development server starts correctly
- ✅ All dependencies installed

## 📚 Documentation

- [README.md](./README.md) - Full documentation
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Project status and features

## 🆘 Troubleshooting

### Server won't start?
1. Make sure no other process is using port 3000
2. Delete the `.next` folder and rebuild: `npm run build`
3. Clear node_modules and reinstall: `Remove-Item .\node_modules -Recurse ; npm install`

### Database errors?
1. Ensure PostgreSQL is running
2. Check your DATABASE_URL in `.env`
3. Run `npm run prisma:generate` to regenerate the client

### Build errors?
1. Run `npm run prisma:generate` first
2. Delete `.next` folder: `Remove-Item .\.next -Recurse`
3. Rebuild: `npm run build`

---

**Happy coding! 🎉**

For any issues, check the README.md or PROJECT_STATUS.md files.
