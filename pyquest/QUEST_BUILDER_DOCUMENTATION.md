# Quest Builder Implementation

## Overview

The Quest Builder is an internal admin tool that enables content creators to design, validate, preview, and export Python learning quests through an intuitive form-based interface.

## Features Implemented

### 1. **Protected Admin Page** (`/admin/quest-builder`)
- Authentication-protected route (requires sign-in)
- Redirects to sign-in page if not authenticated
- Clean, modern UI with gradient background
- Three main tabs: Form, Preview, and Export

### 2. **Comprehensive Form UI**

#### Basic Information Section
- **Quest ID**: Validated lowercase-with-hyphens format
- **World Selection**: Dropdown for Python Basics, Data Structures, Algorithms, OOP
- **Title**: Quest name (max 100 characters)
- **Story**: Background narrative (max 1000 characters)
- **Instructions**: Clear learning objectives (max 1000 characters)
- **Difficulty**: Beginner, Intermediate, or Advanced
- **XP Reward**: 1-1000 XP points
- **Order**: Quest sequence number
- **Hint Unlock Attempts**: After how many attempts hints unlock (1-10)

#### Code Section
- **Starter Code**: Initial code provided to learners
- **Solution (Hidden)**: Reference solution for validation

#### Tests Section
- Dynamic test creation with Add/Remove functionality
- **Test Types**:
  - Output matching
  - Variable existence
  - Variable type checking
  - Variable value validation
  - Function call verification
  - List contents checking
  - List length validation
- Each test includes:
  - Unique ID
  - Description
  - Expected behavior
  - Type-specific parameters

#### Hints Section
- Progressive hints with levels
- Add/Remove hint functionality
- Each hint includes:
  - Level number
  - Hint text

### 3. **Zod Schema Validation** (`lib/quest-schema.ts`)

Comprehensive validation schema with:
- Required field validation
- String length constraints
- Regex patterns (e.g., quest ID format)
- Numeric ranges (XP: 1-1000, attempts: 1-10)
- Array minimum requirements (at least 1 test, 1 hint)
- Type-safe TypeScript types exported

**Validation Rules**:
```typescript
- id: lowercase with hyphens only
- title: 1-100 characters
- story: 1-1000 characters
- instructions: 1-1000 characters
- xpReward: 1-1000
- hintUnlockAttempts: 1-10
- tests: minimum 1 required
- hints: minimum 1 required
- difficulty: enum (beginner/intermediate/advanced)
```

### 4. **Real-time Preview**

The Preview tab displays:
- Quest title and metadata
- Story and instructions
- Starter code (syntax-highlighted)
- Metadata cards showing:
  - Difficulty level
  - XP reward
  - Number of tests
  - Number of hints
- All tests with descriptions
- All hints organized by level

### 5. **Export & Save Functionality**

#### Export to JSON
- Download quest as properly formatted JSON file
- Automatic filename: `{quest-id}.json`
- Validation before export

#### Save to Server
- API endpoint: `POST /api/admin/quests`
- Saves quest to `content/quests/{quest-id}.json`
- Authentication required
- Server-side Zod validation
- Automatic directory creation

### 6. **API Endpoints**

#### `POST /api/admin/quests`
- Validates quest data with Zod
- Creates `content/quests/` directory if needed
- Writes quest JSON file
- Returns success status with file path

#### `GET /api/admin/quests`
- Lists all available quest files
- Returns array of quest IDs

### 7. **Animations & UX**

- Smooth fade-in animations using Framer Motion
- Staggered world card animations
- Progress bar animations
- Tab transitions
- Form field validation feedback
- Real-time validation status indicator (✅ Valid / ❌ Invalid)

### 8. **Mobile Responsive**
- Responsive grid layouts
- Single column on mobile
- Touch-friendly buttons
- Scrollable content areas
- Responsive font sizes

## File Structure

```
app/
  admin/
    quest-builder/
      page.tsx              # Protected admin page
  api/
    admin/
      quests/
        route.ts            # Quest save API endpoint

components/
  quest-builder.tsx         # Main Quest Builder component

lib/
  quest-schema.ts           # Zod validation schemas
```

## Usage Instructions

### For Content Creators

1. **Access**: Navigate to `/admin/quest-builder` (must be signed in)
2. **Fill Form**: Complete all required fields (marked with *)
3. **Add Tests**: Click "+ Add Test" to create validation tests
4. **Add Hints**: Click "+ Add Hint" to add progressive hints
5. **Validate**: Click "🔍 Validate" to check for errors
6. **Preview**: Switch to Preview tab to see how it looks
7. **Export**: 
   - Download JSON: Click "📥 Download JSON"
   - Save to Server: Click "💾 Save Quest"
8. **Commit**: Place exported file in `content/quests/` and commit

### Validation Workflow

```
1. Fill form → 2. Click Validate
               ↓
3. Fix errors if any → 4. Re-validate
                       ↓
5. Preview quest → 6. Export/Save
                   ↓
7. Commit to repository
```

## Schema Updates

### Fixed Issues
- Removed duplicate `createdAt` field in `AchievementDefinition`
- Added missing relation field for `oldAchievements` in User model
- Added `userAchievements` relation to `AchievementDefinition`
- Fixed `xpAwarded` field usage (now uses `xpEarned > 0` check)
- Removed non-existent `firstCompletedAt` field from QuestAttempt operations

### Authentication Updates
- Updated to NextAuth v5 `auth()` function
- Removed deprecated `getServerSession`
- Exported `authOptions` for compatibility

## Dependencies Added

- **zod**: Schema validation (`^3.x`)
- **framer-motion**: Animations (`^11.x`)

## Security

- Route protected with NextAuth authentication
- Server-side validation on all API endpoints
- File system operations scoped to `content/quests/` directory
- No arbitrary file write capabilities

## Future Enhancements

Potential improvements:
- Quest editing (load existing quest by ID)
- Bulk import/export
- Quest duplication
- Version history
- Direct Git commit integration
- Quest preview with live Python execution
- Import from existing quest files
- Quest templates
- Collaborative editing
- Quest approval workflow

## Testing Checklist

- [x] Form validation works correctly
- [x] All required fields enforce requirements
- [x] Test addition/removal functions properly
- [x] Hint addition/removal works
- [x] Preview displays correctly
- [x] JSON export downloads proper file
- [x] Save API creates file correctly
- [x] Authentication protects the route
- [x] Zod validation catches invalid data
- [x] Build completes without errors
- [x] Mobile responsive layout works

## CodeRabbit Review Notes

This implementation focuses on:
1. **Type Safety**: Full TypeScript with Zod validation
2. **UX**: Intuitive form interface with real-time feedback
3. **Security**: Authentication and validation at all levels
4. **Maintainability**: Clear separation of concerns
5. **Extensibility**: Easy to add new test types or features

The Quest Builder provides a complete solution for non-technical content creators to design learning quests without touching code directly.
