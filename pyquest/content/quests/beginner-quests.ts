export const questsData = [
  {
    id: 'quest-1',
    title: 'Python Basics: Hello World',
    description: 'Learn the fundamentals of Python by printing your first message.',
    difficulty: 'beginner',
    category: 'basics',
    order: 1,
    xpReward: 100,
    isPublished: true,
    challenges: [
      {
        title: 'Print Hello World',
        description: 'Use the print() function to output "Hello, World!" to the console.',
        starterCode: '# Write your code here\n',
        solution: 'print("Hello, World!")',
        testCases: [
          {
            input: '',
            expectedOutput: 'Hello, World!',
            description: 'Should print Hello, World!',
          },
        ],
        hints: [
          'Use the print() function',
          'Put the text in quotes',
          'Remember the comma and exclamation mark',
        ],
        order: 1,
      },
    ],
  },
  {
    id: 'quest-2',
    title: 'Variables and Data Types',
    description: 'Master Python variables and understand different data types.',
    difficulty: 'beginner',
    category: 'basics',
    order: 2,
    xpReward: 150,
    isPublished: true,
    challenges: [
      {
        title: 'Create Variables',
        description:
          'Create three variables: name (string), age (integer), and height (float).',
        starterCode:
          '# Create your variables here\nname = \nage = \nheight = \n\nprint(name, age, height)',
        solution: 'name = "Alice"\nage = 25\nheight = 5.6\n\nprint(name, age, height)',
        testCases: [
          {
            input: '',
            expectedOutput: 'Alice 25 5.6',
            description: 'Should print the three variables',
          },
        ],
        hints: [
          'Strings use quotes',
          'Integers are whole numbers',
          'Floats have decimal points',
        ],
        order: 1,
      },
    ],
  },
  {
    id: 'quest-3',
    title: 'Control Flow: If Statements',
    description: 'Learn to make decisions in your code with if statements.',
    difficulty: 'beginner',
    category: 'control-flow',
    order: 3,
    xpReward: 200,
    isPublished: true,
    challenges: [
      {
        title: 'Check if Number is Positive',
        description: 'Write a function that checks if a number is positive, negative, or zero.',
        starterCode:
          'def check_number(num):\n    # Write your code here\n    pass\n\nprint(check_number(5))\nprint(check_number(-3))\nprint(check_number(0))',
        solution:
          'def check_number(num):\n    if num > 0:\n        return "positive"\n    elif num < 0:\n        return "negative"\n    else:\n        return "zero"\n\nprint(check_number(5))\nprint(check_number(-3))\nprint(check_number(0))',
        testCases: [
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
        ],
        hints: [
          'Use if, elif, and else statements',
          'Compare numbers with > and <',
          'Return the appropriate string',
        ],
        order: 1,
      },
    ],
  },
];
