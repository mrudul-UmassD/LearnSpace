import fs from 'fs';
import path from 'path';
import { QuestData, WorldData } from '@/types/quest';

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

    const files = fs.readdirSync(questsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    jsonFiles.forEach(file => {
      try {
        const filePath = path.join(questsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const quest: QuestData = JSON.parse(content);
        
        this.quests.set(quest.id, quest);

        // Build world metadata
        if (!this.worlds.has(quest.world)) {
          this.worlds.set(quest.world, {
            id: quest.world,
            name: this.formatWorldName(quest.world),
            description: `Learn ${this.formatWorldName(quest.world)}`,
            totalQuests: 0,
            requiredXP: quest.world === 'python-basics' ? 0 : 200
          });
        }

        const world = this.worlds.get(quest.world)!;
        world.totalQuests++;
      } catch (error) {
        console.error(`Error loading quest ${file}:`, error);
      }
    });

    this.loaded = true;
    console.log(`Loaded ${this.quests.size} quests across ${this.worlds.size} worlds`);
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
