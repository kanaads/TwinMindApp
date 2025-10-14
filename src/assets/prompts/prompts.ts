/**
 * Centralized AI Prompts
 * All AI prompts and templates used throughout the application
 */

export const AI_PROMPTS = {
  /**
   * Meeting Summary Generation
   */
  MEETING_SUMMARY: `Analyze this meeting transcript and return ONLY a valid JSON object. Use this exact format:

{
  "summary": "Brief meeting summary",
  "actionItems": ["Action item 1", "Action item 2"],
  "keyPoints": ["Key point 1", "Key point 2"],
  "participants": ["Participant 1", "Participant 2"],
  "duration": 30,
  "timestamp": ${Date.now()}
}

Transcript:
{transcript}

Return only the JSON object, no additional text.`,

  /**
   * Action Items Extraction
   */
  ACTION_ITEMS: `Extract specific action items from the following meeting transcript. Return only a JSON array of action items, each as a string. Focus on tasks that have clear owners and deadlines.

Transcript:
{transcript}

Return only the JSON array, no additional text.`,

  /**
   * Key Points Extraction
   */
  KEY_POINTS: `Extract the most important discussion points and decisions from the following meeting transcript. Return only a JSON array of key points, each as a string.

Transcript:
{transcript}

Return only the JSON array, no additional text.`,

  /**
   * Chat with Transcript
   */
  CHAT_WITH_TRANSCRIPT: `You are an AI assistant helping users understand and analyze meeting transcripts. 

Meeting Transcript:
{transcript}

Previous conversation:
{conversationHistory}

User's current question: {userMessage}

Please provide a helpful response based on the transcript content. Be specific and reference relevant parts of the transcript when possible. Keep your response concise but informative.`,

  /**
   * Suggested Questions Generation
   */
  SUGGESTED_QUESTIONS: `Based on this meeting transcript, generate 3-5 helpful questions a user might want to ask about the content. Focus on key topics, decisions, and action items.

Transcript:
{transcript}

Return only a JSON array of questions, no additional text.`,

  /**
   * Error Messages
   */
  ERROR_MESSAGES: {
    GENERIC_ERROR: 'Sorry, I encountered an error. Please try again.',
    NO_TRANSCRIPT: 'No transcript content available',
    LOADING_ERROR: 'Failed to load content. Please try again.',
    AI_SERVICE_ERROR: 'AI service is currently unavailable. Please try again later.',
  },

  /**
   * UI Messages
   */
  UI_MESSAGES: {
    LOADING_SUMMARY: 'Generating AI summary...',
    LOADING_QUESTIONS: 'Loading suggested questions...',
    NO_MEMORIES: 'No memories yet.',
    EMPTY_TRANSCRIPT: 'Empty Transcript',
    NO_TRANSCRIPT_CONTENT: 'No transcript content available',
    GENERATING_SUGGESTIONS: 'Generating suggestions...',
  },

  /**
   * Placeholder Text
   */
  PLACEHOLDERS: {
    CHAT_INPUT: 'Ask about the transcript...',
    SEARCH_INPUT: 'Search memories...',
    NOTES_INPUT: 'Add your notes here...',
  },
} as const;

/**
 * Template function to replace placeholders in prompts
 */
export function formatPrompt(template: string, variables: Record<string, string | number>): string {
  let formatted = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    formatted = formatted.replace(new RegExp(placeholder, 'g'), String(value));
  }
  
  return formatted;
}

/**
 * Common prompt utilities
 */
export const PROMPT_UTILS = {
  /**
   * Format meeting summary prompt
   */
  formatMeetingSummary: (transcript: string): string => {
    return formatPrompt(AI_PROMPTS.MEETING_SUMMARY, { transcript });
  },

  /**
   * Format action items prompt
   */
  formatActionItems: (transcript: string): string => {
    return formatPrompt(AI_PROMPTS.ACTION_ITEMS, { transcript });
  },

  /**
   * Format key points prompt
   */
  formatKeyPoints: (transcript: string): string => {
    return formatPrompt(AI_PROMPTS.KEY_POINTS, { transcript });
  },

  /**
   * Format chat with transcript prompt
   */
  formatChatWithTranscript: (
    transcript: string, 
    userMessage: string, 
    conversationHistory: string
  ): string => {
    return formatPrompt(AI_PROMPTS.CHAT_WITH_TRANSCRIPT, {
      transcript,
      userMessage,
      conversationHistory,
    });
  },

  /**
   * Format suggested questions prompt
   */
  formatSuggestedQuestions: (transcript: string): string => {
    return formatPrompt(AI_PROMPTS.SUGGESTED_QUESTIONS, { transcript });
  },
} as const;
