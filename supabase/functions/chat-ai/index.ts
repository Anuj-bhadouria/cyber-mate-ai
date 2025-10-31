import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode = 'assessment' } = await req.json();
    console.log('Chat request received:', { mode, messageCount: messages?.length });
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // System prompts for different modes
    const systemPrompts = {
      assessment: `You are CyberMate, a friendly helper for staying safe online.

Important rules:
- Use simple, everyday language (no technical jargon)
- Explain things like you're talking to a friend who isn't tech-savvy
- Give practical advice that anyone can follow
- Break down complex ideas into easy steps
- Use analogies (like "a password is like a lock on your door")
- Be encouraging and never make users feel bad
- Focus on what they can do RIGHT NOW to be safer

Ask simple questions to understand their situation, then give clear, actionable advice.`,
      
      incident: `You are CyberMate, here to help if something bad happened online.

Important rules:
- Stay calm and reassuring - don't scare them
- Use plain language (say "account" not "credentials", "hacker" not "threat actor")
- Ask simple questions to understand what happened
- Give clear, step-by-step instructions
- Explain WHY each step matters in simple terms
- Break solutions into small, easy actions
- Let them know if they need professional help (like calling 1930 helpline)

Help them fix the problem without overwhelming them with technical details.`,
      
      awareness: `You are CyberMate, teaching people about staying safe online in a fun, easy way.

Important rules:
- Use real-life examples everyone understands
- Explain WHY something is risky, not just that it is
- Give tips anyone can use right away
- Use simple comparisons (like "sharing passwords is like giving someone your house key")
- Make it conversational and friendly, not preachy
- Keep explanations short and memorable
- Celebrate good security habits

Make learning about online safety easy and interesting!`,
      
      helpline: `You are CyberMate, a supportive helper for people with security questions or worries.

Key Resources in India:
- Cyber Crime Helpline: Call 1930 (free, 24/7)
- Report online crimes: cybercrime.gov.in
- CERT-In for technical help: cert-in.org.in

Important rules:
- Be warm, patient, and understanding
- Never assume they know tech terms - explain everything simply
- Say things like "That's a smart question to ask"
- Give quick, clear answers they can act on immediately
- If they're worried, be extra reassuring
- Use bullet points to make things easy to read
- Tell them when something needs an expert

Help them feel safe and guided, not confused or scared.`
    };

    const systemPrompt = systemPrompts[mode as keyof typeof systemPrompts] || systemPrompts.assessment;

    console.log('Calling Lovable AI Gateway with mode:', mode);
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Too many requests. Please wait a moment and try again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage quota exceeded. Please add credits in Settings > Workspace > Usage.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Lovable AI Gateway error: ${response.status} ${errorText}`);
    }

    console.log('Streaming response from Lovable AI');
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in chat-ai function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});