import { NextRequest } from 'next/server';
import { SYSTEM_PROMPTS } from '@/lib/agent-config';
import { AgentMode } from '@/lib/types';
import { searchWeb, needsWebSearch, formatSearchContext } from '@/lib/search';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Groq OpenAI-compatible endpoint
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, mode = 'chat', conversationHistory = [] } = body;

    if (!process.env.GROQ_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            'GROQ_API_KEY is not configured. Please add it to your .env.local file. Get a key at https://console.groq.com',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userMessage = messages[messages.length - 1]?.content || '';
    let systemPrompt = SYSTEM_PROMPTS[mode as AgentMode] || SYSTEM_PROMPTS.chat;

    // ===========================
    // Auto Web Search Detection
    // ===========================
    let searchContext = '';
    let searchPerformed = false;

    if (needsWebSearch(userMessage) && process.env.TAVILY_API_KEY) {
      console.log(`🔍 Web search triggered for: "${userMessage.substring(0, 80)}..."`);

      const searchResults = await searchWeb(userMessage);

      if (searchResults.results.length > 0) {
        searchContext = formatSearchContext(searchResults);
        searchPerformed = true;
        console.log(`✅ Found ${searchResults.results.length} results`);
      }
    }

    // Enrich system prompt with search context if available
    if (searchPerformed && searchContext) {
      systemPrompt += `\n\n===== REAL-TIME WEB SEARCH CONTEXT =====\nThe following web search was automatically performed to help you answer the user's question with up-to-date information. Use these results to give an accurate, current answer.\n${searchContext}`;
    }

    // If search was needed but no Tavily key configured
    if (needsWebSearch(userMessage) && !process.env.TAVILY_API_KEY) {
      systemPrompt += `\n\nNOTE: The user is asking about something that may require current/real-time information. You don't have web search enabled. Answer with what you know, but be transparent about your knowledge cutoff date. Suggest the user can enable web search by adding a TAVILY_API_KEY to get real-time answers.`;
    }

    // Build message array (OpenAI format)
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: userMessage,
      },
    ];

    // Call Groq with streaming
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: apiMessages,
        max_tokens: 8192,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('Groq API error:', errText);
      return new Response(
        JSON.stringify({ error: `Groq API error: ${groqResponse.status} — ${errText}` }),
        { status: groqResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Transform Groq SSE → our SSE format
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const reader = groqResponse.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          controller.close();
          return;
        }

        // Send search indicator if search was performed
        if (searchPerformed) {
          const searchIndicator = JSON.stringify({
            type: 'text',
            content: '🔍 *Searched the web for real-time information...*\n\n',
          });
          controller.enqueue(encoder.encode(`data: ${searchIndicator}\n\n`));
        }

        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === 'data: [DONE]') {
                if (trimmed === 'data: [DONE]') {
                  const doneData = JSON.stringify({ type: 'done' });
                  controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
                }
                continue;
              }

              if (trimmed.startsWith('data: ')) {
                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const text = json.choices?.[0]?.delta?.content;
                  if (text) {
                    const data = JSON.stringify({ type: 'text', content: text });
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                  }
                } catch {
                  // Skip malformed chunks
                }
              }
            }
          }
        } catch (error) {
          const errData = JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Stream error',
          });
          controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Agent API error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'NEXUS Agent API is running',
      provider: 'Groq',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      webSearch: !!process.env.TAVILY_API_KEY ? 'enabled' : 'disabled',
      modes: 10,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
