import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create test user
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'test@pyquest.dev' },
    update: {},
    create: {
      email: 'test@pyquest.dev',
      name: 'Test User',
      password: hashedPassword,
    },
  });

  console.log('✅ Created test user:', user.email);

  // Create sample quests
  const quest1 = await prisma.quest.upsert({
    where: { id: 'quest-1' },
    update: {},
    create: {
      id: 'quest-1',
      title: 'Python Basics: Hello World',
      description: 'Learn the fundamentals of Python by printing your first message.',
      difficulty: 'beginner',
      category: 'basics',
      order: 1,
      xpReward: 100,
      isPublished: true,
    },
  });

  const quest2 = await prisma.quest.upsert({
    where: { id: 'quest-2' },
    update: {},
    create: {
      id: 'quest-2',
      title: 'Variables and Data Types',
      description: 'Master Python variables and understand different data types.',
      difficulty: 'beginner',
      category: 'basics',
      order: 2,
      xpReward: 150,
      isPublished: true,
    },
  });

  const quest3 = await prisma.quest.upsert({
    where: { id: 'quest-3' },
    update: {},
    create: {
      id: 'quest-3',
      title: 'Control Flow: If Statements',
      description: 'Learn to make decisions in your code with if statements.',
      difficulty: 'beginner',
      category: 'control-flow',
      order: 3,
      xpReward: 200,
      isPublished: true,
    },
  });

  console.log('✅ Created quests:', quest1.title, quest2.title, quest3.title);

  // Create challenges for quest 1
  await prisma.challenge.upsert({
    where: { id: 'challenge-1-1' },
    update: {},
    create: {
      id: 'challenge-1-1',
      questId: quest1.id,
      title: 'Print Hello World',
      description: 'Use the print() function to output "Hello, World!" to the console.',
      starterCode: '# Write your code here\n',
      solution: 'print("Hello, World!")',
      testCases: JSON.stringify([
        {
          input: '',
          expectedOutput: 'Hello, World!',
          description: 'Should print Hello, World!',
        },
      ]),
      hints: JSON.stringify([
        'Use the print() function',
        'Put the text in quotes',
        'Remember the comma and exclamation mark',
      ]),
      order: 1,
    },
  });

  // Create challenges for quest 2
  await prisma.challenge.upsert({
    where: { id: 'challenge-2-1' },
    update: {},
    create: {
      id: 'challenge-2-1',
      questId: quest2.id,
      title: 'Create Variables',
      description: 'Create three variables: name (string), age (integer), and height (float).',
      starterCode: '# Create your variables here\nname = \nage = \nheight = \n\nprint(name, age, height)',
      solution: 'name = "Alice"\nage = 25\nheight = 5.6\n\nprint(name, age, height)',
      testCases: JSON.stringify([
        {
          input: '',
          expectedOutput: 'Alice 25 5.6',
          description: 'Should print the three variables',
        },
      ]),
      hints: JSON.stringify([
        'Strings use quotes',
        'Integers are whole numbers',
        'Floats have decimal points',
      ]),
      order: 1,
    },
  });

  // Create challenges for quest 3
  await prisma.challenge.upsert({
    where: { id: 'challenge-3-1' },
    update: {},
    create: {
      id: 'challenge-3-1',
      questId: quest3.id,
      title: 'Check if Number is Positive',
      description: 'Write a function that checks if a number is positive, negative, or zero.',
      starterCode:
        'def check_number(num):\n    # Write your code here\n    pass\n\nprint(check_number(5))\nprint(check_number(-3))\nprint(check_number(0))',
      solution:
        'def check_number(num):\n    if num > 0:\n        return "positive"\n    elif num < 0:\n        return "negative"\n    else:\n        return "zero"\n\nprint(check_number(5))\nprint(check_number(-3))\nprint(check_number(0))',
      testCases: JSON.stringify([
        {
          input: '5',
          expectedOutput: 'positive',
          description: 'Positive numbers should return "positive"',
        },
        {
          input: '-3',
          expectedOutput: 'negative',
          description: 'Negative numbers should return "negative"',
        },
        {
          input: '0',
          expectedOutput: 'zero',
          description: 'Zero should return "zero"',
        },
      ]),
      hints: JSON.stringify([
        'Use if, elif, and else statements',
        'Compare numbers with > and <',
        'Return the appropriate string',
      ]),
      order: 1,
    },
  });

  console.log('✅ Created challenges');

  // Create sample progress for test user
  await prisma.userProgress.upsert({
    where: {
      userId_questId: {
        userId: user.id,
        questId: quest1.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      questId: quest1.id,
      completed: true,
      score: 100,
      attempts: 2,
    },
  });

  await prisma.userProgress.upsert({
    where: {
      userId_questId: {
        userId: user.id,
        questId: quest2.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      questId: quest2.id,
      completed: false,
      score: 75,
      attempts: 1,
    },
  });

  console.log('✅ Created user progress');

  // Create sample achievement
  await prisma.achievement.create({
    data: {
      userId: user.id,
      title: 'First Steps',
      description: 'Completed your first quest!',
      icon: '🎉',
    },
  });

  console.log('✅ Created achievement');

  console.log('🎉 Seed completed successfully!');
  console.log('\n📝 Test credentials:');
  console.log('Email: test@pyquest.dev');
  console.log('Password: password123');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
