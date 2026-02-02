import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { questDataSchema } from '@/lib/quest-schema';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate quest data with Zod
    const validationResult = questDataSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const quest = validationResult.data;

    // Save quest to file
    const questsDir = path.join(process.cwd(), 'content', 'quests');
    const filePath = path.join(questsDir, `${quest.id}.json`);

    // Ensure directory exists
    await mkdir(questsDir, { recursive: true });

    // Write quest file
    await writeFile(filePath, JSON.stringify(quest, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Quest saved successfully',
      questId: quest.id,
      filePath: `content/quests/${quest.id}.json`,
    });
  } catch (error) {
    console.error('Error saving quest:', error);
    return NextResponse.json(
      { error: 'Failed to save quest', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return list of available quests
    const { readdir } = await import('fs/promises');
    const questsDir = path.join(process.cwd(), 'content', 'quests');
    
    try {
      const files = await readdir(questsDir);
      const questFiles = files.filter(f => f.endsWith('.json'));
      
      return NextResponse.json({
        success: true,
        quests: questFiles.map(f => f.replace('.json', '')),
      });
    } catch (error) {
      return NextResponse.json({
        success: true,
        quests: [],
      });
    }
  } catch (error) {
    console.error('Error listing quests:', error);
    return NextResponse.json(
      { error: 'Failed to list quests' },
      { status: 500 }
    );
  }
}
