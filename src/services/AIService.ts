/**
 * AI Service
 * Handles AI-powered features including meeting summaries using Gemini AI
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GEMINI_API_KEY } from '../config/ai';
const STORAGE_KEYS = {
  MEETING_SUMMARY: (userId: string, memoryId: string) => `MEETING_SUMMARY_${userId}_${memoryId}`,
} as const;

export interface MeetingSummary {
  summary: string;
  actionItems: string[];
  keyPoints: string[];
  participants?: string[];
  duration?: number;
  timestamp: number;
}

export interface AIServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
}

export interface ChatContext {
  transcript: string;
  userId: string;
  memoryId: string;
}

export class AIService {
  private static instance: AIService;
  private genAI: GoogleGenerativeAI;

  private constructor() {
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Generate meeting summary from transcript
   */
  public async generateMeetingSummary(
    transcript: string,
    userId: string,
    memoryId: string
  ): Promise<AIServiceResult<MeetingSummary>> {
    try {
      if (!transcript || transcript.trim().length === 0) {
        return {
          success: false,
          error: 'No transcript provided',
        };
      }
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `Analyze this meeting transcript and return ONLY a valid JSON object. Use this exact format:

{
  "summary": "Brief meeting summary",
  "keyPoints": [
    "Topic 1 - Point 1, Point 2",
    "Topic 2 - Point 1, Point 2"
  ],
  "actionItems": ["Action 1", "Action 2"],
  "participants": ["Name 1", "Name 2"],
  "duration": 30
}

IMPORTANT:
- Return ONLY the JSON object
- No markdown, no code blocks, no explanations
- Use double quotes for all strings
- Keep all text on single lines
- No special characters or control characters
- Extract real information from the transcript

Transcript:
${transcript}

JSON:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      

      // Parse the JSON response
      let parsedResponse;
      try {
        // Clean up the response text to extract JSON
        let jsonString = text.trim();
        
        // Remove any markdown code blocks if present
        if (jsonString.startsWith('```json')) {
          jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonString.startsWith('```')) {
          jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Find JSON object in the response
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
        
        // Clean up control characters and special characters
        jsonString = jsonString
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim();
        
        // Ensure proper JSON structure
        if (!jsonString.startsWith('{') || !jsonString.endsWith('}')) {
          throw new Error('Invalid JSON structure');
        }
        
        parsedResponse = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        console.error('Raw response text:', text.substring(0, 300));
        
        // Fallback: create a basic summary if JSON parsing fails
        const cleanText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').substring(0, 200);
        parsedResponse = {
          summary: cleanText + '...',
          actionItems: ['Review transcript for specific action items'],
          keyPoints: ['Meeting discussion captured'],
          participants: [],
          duration: 30,
        };
      }

      const meetingSummary: MeetingSummary = {
        summary: parsedResponse.summary || 'Meeting summary generated',
        actionItems: Array.isArray(parsedResponse.actionItems) ? parsedResponse.actionItems : [],
        keyPoints: Array.isArray(parsedResponse.keyPoints) ? parsedResponse.keyPoints : [],
        participants: Array.isArray(parsedResponse.participants) ? parsedResponse.participants : [],
        duration: parsedResponse.duration || 30,
        timestamp: Date.now(),
      };

      // Save to local storage
      await this.saveMeetingSummary(userId, memoryId, meetingSummary);

      return {
        success: true,
        data: meetingSummary,
      };
    } catch (error) {
      console.error('Error generating meeting summary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate summary',
      };
    }
  }

  /**
   * Save meeting summary to local storage
   */
  private async saveMeetingSummary(
    userId: string,
    memoryId: string,
    summary: MeetingSummary
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.MEETING_SUMMARY(userId, memoryId),
        JSON.stringify(summary)
      );
    } catch (error) {
      console.error('Error saving meeting summary:', error);
    }
  }

  /**
   * Get saved meeting summary
   */
  public async getMeetingSummary(
    userId: string,
    memoryId: string
  ): Promise<AIServiceResult<MeetingSummary>> {
    try {
      const summaryData = await AsyncStorage.getItem(
        STORAGE_KEYS.MEETING_SUMMARY(userId, memoryId)
      );

      if (!summaryData) {
        return {
          success: false,
          error: 'No summary found',
        };
      }

      const summary = JSON.parse(summaryData) as MeetingSummary;
      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve summary',
      };
    }
  }

  /**
   * Generate action items from transcript
   */
  public async generateActionItems(transcript: string): Promise<AIServiceResult<string[]>> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `
Extract specific action items from the following meeting transcript. Return only a JSON array of action items, each as a string. Focus on tasks that have clear owners and deadlines.

Transcript:
${transcript}

Format: ["Action item 1", "Action item 2", ...]
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON array
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const actionItems = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          data: Array.isArray(actionItems) ? actionItems : [],
        };
      }

      return {
        success: false,
        error: 'Could not parse action items',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate action items',
      };
    }
  }

  /**
   * Generate key points from transcript
   */
  public async generateKeyPoints(transcript: string): Promise<AIServiceResult<string[]>> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `
Extract the most important discussion points and decisions from the following meeting transcript. Return only a JSON array of key points, each as a string.

Transcript:
${transcript}

Format: ["Key point 1", "Key point 2", ...]
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON array
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const keyPoints = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          data: Array.isArray(keyPoints) ? keyPoints : [],
        };
      }

      return {
        success: false,
        error: 'Could not parse key points',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate key points',
      };
    }
  }

  /**
   * Chat with transcript using Gemini AI
   */
  public async chatWithTranscript(
    userMessage: string,
    context: ChatContext,
    chatHistory: ChatMessage[] = []
  ): Promise<AIServiceResult<string>> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      // Build conversation history for context
      const conversationHistory = chatHistory
        .slice(-10) // Keep last 10 messages for context
        .map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.text}`)
        .join('\n');

      const prompt = `You are an AI assistant helping users understand and analyze meeting transcripts. 

Meeting Transcript:
${context.transcript}

Previous conversation:
${conversationHistory}

User's current question: ${userMessage}

Please provide a helpful response based on the transcript content. Be specific and reference relevant parts of the transcript when possible. Keep your response concise but informative.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        data: text.trim(),
      };
    } catch (error) {
      console.error('Error in chat with transcript:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate response',
      };
    }
  }

  /**
   * Generate suggested questions based on transcript
   */
  public async generateSuggestedQuestions(transcript: string): Promise<AIServiceResult<string[]>> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `Based on this meeting transcript, generate 3-5 helpful questions a user might want to ask about the content. Focus on key topics, decisions, and action items.

Transcript:
${transcript}

Return only a JSON array of questions, each as a string.

Format: ["Question 1", "Question 2", ...]`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON array
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          data: Array.isArray(questions) ? questions : [],
        };
      }

      return {
        success: false,
        error: 'Could not parse suggested questions',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate suggested questions',
      };
    }
  }
}
