/**
 * Memory Model
 * Represents memory/transcript data structure
 */

export interface Memory {
  id: string;
  userId: string;
  title: string;
  content: string;
  segments: TranscriptSegment[];
  duration: number;
  createdAt: Date;
  updatedAt: Date;
  isCompleted: boolean;
  tags: string[];
}

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  confidence: number;
  isUploaded: boolean;
  createdAt: Date;
}

export interface MemorySummary {
  id: string;
  title: string;
  duration: number;
  segmentCount: number;
  createdAt: Date;
  lastUpdatedAt: Date;
}

export interface CreateMemoryRequest {
  userId: string;
  title?: string;
  initialSegment?: Omit<TranscriptSegment, 'id' | 'createdAt'>;
}

export interface UpdateMemoryRequest {
  id: string;
  title?: string;
  segments?: TranscriptSegment[];
  isCompleted?: boolean;
  tags?: string[];
}

export class MemoryModel {
  constructor(
    public id: string,
    public userId: string,
    public title: string,
    public content: string,
    public segments: TranscriptSegment[],
    public duration: number,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public isCompleted: boolean = false,
    public tags: string[] = []
  ) {}

  static create(userId: string, title?: string): MemoryModel {
    const id = Date.now().toString();
    return new MemoryModel(
      id,
      userId,
      title || `Memory ${new Date().toLocaleDateString()}`,
      '',
      [],
      0
    );
  }

  static fromStorage(storedMemory: any): MemoryModel {
    return new MemoryModel(
      storedMemory.id,
      storedMemory.userId,
      storedMemory.title,
      storedMemory.content,
      storedMemory.segments || [],
      storedMemory.duration || 0,
      new Date(storedMemory.createdAt || Date.now()),
      new Date(storedMemory.updatedAt || Date.now()),
      storedMemory.isCompleted || false,
      storedMemory.tags || []
    );
  }

  toStorage(): any {
    return {
      id: this.id,
      userId: this.userId,
      title: this.title,
      content: this.content,
      segments: this.segments,
      duration: this.duration,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      isCompleted: this.isCompleted,
      tags: this.tags,
    };
  }

  addSegment(segment: Omit<TranscriptSegment, 'id' | 'createdAt'>): void {
    const newSegment: TranscriptSegment = {
      id: Date.now().toString(),
      ...segment,
      createdAt: new Date(),
    };
    this.segments.push(newSegment);
    this.updateContent();
    this.updatedAt = new Date();
  }

  updateSegment(segmentId: string, updates: Partial<TranscriptSegment>): void {
    const segmentIndex = this.segments.findIndex(s => s.id === segmentId);
    if (segmentIndex !== -1) {
      this.segments[segmentIndex] = { ...this.segments[segmentIndex], ...updates };
      this.updateContent();
      this.updatedAt = new Date();
    }
  }

  removeSegment(segmentId: string): void {
    this.segments = this.segments.filter(s => s.id !== segmentId);
    this.updateContent();
    this.updatedAt = new Date();
  }

  private updateContent(): void {
    this.content = this.segments
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(s => s.text)
      .join(' ');
  }

  getSummary(): MemorySummary {
    return {
      id: this.id,
      title: this.title,
      duration: this.duration,
      segmentCount: this.segments.length,
      createdAt: this.createdAt,
      lastUpdatedAt: this.updatedAt,
    };
  }

  getUnuploadedSegments(): TranscriptSegment[] {
    return this.segments.filter(s => !s.isUploaded);
  }

  markSegmentsAsUploaded(segmentIds: string[]): void {
    this.segments.forEach(segment => {
      if (segmentIds.includes(segment.id)) {
        segment.isUploaded = true;
      }
    });
    this.updatedAt = new Date();
  }

  complete(): void {
    this.isCompleted = true;
    this.updatedAt = new Date();
  }

  addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.updatedAt = new Date();
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag);
    this.updatedAt = new Date();
  }

  isValid(): boolean {
    return !!(this.id && this.userId && this.title);
  }
}
