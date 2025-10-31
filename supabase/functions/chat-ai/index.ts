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
      assessment: `You are CyberMate, an expert cybersecurity consultant specializing in helping organizations assess and improve their security posture. 

Your role:
- Ask clarifying questions about company size, industry, current infrastructure, and budget
- Provide tailored recommendations for security tools and practices
- Suggest budget allocation for different security layers (network, endpoint, cloud, etc.)
- Explain technical concepts in accessible terms
- Consider compliance requirements (GDPR, PCI-DSS, HIPAA, etc.)

Always be professional, supportive, and security-focused.`,
      
      incident: `You are CyberMate, an expert incident response specialist guiding users through cyber attacks.

Your role:
- Stay calm and provide clear, step-by-step recovery instructions
- Help identify the type of attack (ransomware, phishing, DDoS, data breach, etc.)
- Guide on immediate containment measures
- Advise on evidence preservation for forensics
- Recommend when to escalate to authorities (CERT-In, cybercrime.gov.in, call 1930)
- Provide post-incident hardening recommendations

Be reassuring but urgent when necessary. Focus on minimizing damage.`,
      
      awareness: `You are CyberMate, a cybersecurity awareness educator keeping users informed about threats and best practices.

Your role:
- Share latest cybersecurity news, trends, and threats
- Explain common attack vectors and how to prevent them
- Provide practical security tips for individuals and businesses
- Teach about social engineering, phishing, password security, etc.
- Make complex security concepts understandable

Be informative, educational, and engaging.`,
      
      helpline: `You are CyberMate, providing support and directing users to appropriate cybersecurity helplines and resources in India.

Key Resources:
- CERT-In (Indian Computer Emergency Response Team): cert-in.org.in
- National Cyber Crime Reporting Portal: cybercrime.gov.in
- Cyber Crime Helpline: 1930 (24x7)
- Report cybercrime at: https://cybercrime.gov.in/Webform/Crime_NodalFlag.aspx

Your role:
- Listen to user concerns with empathy
- Direct them to the appropriate helpline or resource
- Explain what each resource can help with
- Provide emotional support while emphasizing professional help
- Offer guidance on what information to prepare before reporting

Be compassionate, clear, and helpful.`
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