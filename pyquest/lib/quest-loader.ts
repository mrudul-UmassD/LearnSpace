import fs from 'fs';
import path from 'path';
import { QuestData, WorldData } from '@/types/quest';
import { questDataSchema } from './quest-schema';

class QuestLoader {
  private quests: Map<string, QuestData> = new Map();
  private worlds: Map<string, WorldData> = new Map();
  private loaded = false;

  constructor() {
    this.loadQuests();
  }

  private loadQuests() {
    if (this.loaded) return;

    const questsDir = path.join(process.cwd(), 'content', 'quests');
    
    if (!fs.existsSync(questsDir)) {
      console.warn('Quests directory not found:', questsDir);
      this.loaded = true;
      return;
    }

    this.loadQuestsFromDir(questsDir);

    this.loaded = true;
    console.log(`Loaded ${this.quests.size} quests across ${this.worlds.size} worlds`);
  }

  private loadQuestsFromDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively load quests from subdirectories
        this.loadQuestsFromDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        this.loadQuestFile(fullPath, entry.name);
      }
    }
  }

  private loadQuestFile(filePath: string, fileName: string) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = questDataSchema.safeParse(JSON.parse(content));

      if (!parsed.success) {
        console.error(`Invalid quest schema in ${fileName}:`, parsed.error.issues);
        return;
      }

      const quest: QuestData = parsed.data;
      
      this.quests.set(quest.id, quest);

      // Build world metadata
      if (!this.worlds.has(quest.world)) {
        this.worlds.set(quest.world, {
          id: quest.world,
          name: this.formatWorldName(quest.world),
          description: `Learn ${this.formatWorldName(quest.world)}`,
          totalQuests: 0,
          requiredXP: this.getWorldRequiredXP(quest.world)
        });
      }

      const world = this.worlds.get(quest.world)!;
      world.totalQuests++;
    } catch (error) {
      console.error(`Error loading quest ${fileName}:`, error);
    }
  }

  private getWorldRequiredXP(worldId: string): number {
    // First world is unlocked from start
    if (worldId === 'python-basics') return 0;
    // Python Thinking requires completing Python Basics
    if (worldId === 'python-thinking') return 300;
    // Other worlds
    return 200;
  }

  private formatWorldName(worldId: string): string {
    return worldId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getQuestById(questId: string): QuestData | undefined {
    return this.quests.get(questId);
  }

  getQuestsByWorld(worldId: string): QuestData[] {
    return Array.from(this.quests.values())
      .filter(quest => quest.world === worldId)
      .sort((a, b) => a.order - b.order);
  }

  getAllWorlds(): WorldData[] {
    return Array.from(this.worlds.values());
  }

  getWorld(worldId: string): WorldData | undefined {
    return this.worlds.get(worldId);
  }

  getAllQuests(): QuestData[] {
    return Array.from(this.quests.values());
  }
}

// Singleton instance
let questLoaderInstance: QuestLoader | null = null;

export function getQuestLoader(): QuestLoader {
  if (!questLoaderInstance) {
    questLoaderInstance = new QuestLoader();
  }
  return questLoaderInstance;
}

export default getQuestLoader;
