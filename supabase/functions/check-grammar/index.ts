// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// We need to import the OpenAI library
import { OpenAI } from "https://esm.sh/openai@4.10.0";

const openAIKey = Deno.env.get("OPENAI_API_KEY");

const openai = new OpenAI({
  apiKey: openAIKey,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // This is a preflight OPTIONS request.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  // This is how you would invoke the function
  // fetch('http://localhost:54321/functions/v1/check-grammar', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': 'Bearer YOUR_ANON_KEY'
  //   },
  //   body: JSON.stringify({ text: "your text to check" })
  // })

  try {
    const { text } = await req.json()

    if (!text) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
            You are an expert writing assistant focused on clarity and conciseness.
            You will be given a text and need to provide suggestions to improve clarity, eliminate wordiness, and enhance readability.
            
            IMPORTANT GUIDELINES:
            1. Focus on COMPLETE SENTENCES or meaningful phrases - don't suggest partial word changes
            2. Target wordy expressions, redundant phrases, and unclear constructions
            3. Preserve the original meaning while making the text more direct and clear
            4. Only suggest changes that significantly improve clarity or conciseness
            5. Avoid trivial suggestions - focus on meaningful improvements
            
            EXAMPLES OF GOOD CLARITY SUGGESTIONS:
            - "Due to the fact that" → "Because"
            - "In order to achieve success" → "To succeed"
            - "It is important to note that" → "Note that" or remove entirely
            - "At this point in time" → "Now"
            - "The reason why this happened is because" → "This happened because"
            
            Respond with a JSON object containing an array of suggestions.
            Each suggestion should have:
            - "type": Always "clarity" for this assistant
            - "original": The complete phrase or sentence to replace (minimum 3 words)
            - "suggestion": The clearer, more concise version
            - "explanation": Why this change improves clarity (be specific)

            Example response:
            {
              "suggestions": [
                {
                  "type": "clarity",
                  "original": "Due to the fact that it is raining",
                  "suggestion": "Because it is raining",
                  "explanation": "Eliminates wordy phrase 'due to the fact that' with simple 'because'"
                },
                {
                  "type": "clarity", 
                  "original": "in order to stay dry",
                  "suggestion": "to stay dry",
                  "explanation": "Removes unnecessary 'in order' - 'to' is sufficient"
                }
              ]
            }
          `,
        },
        { role: "user", content: text },
      ],
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      return new Response(JSON.stringify({ error: "No response from OpenAI" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // The response from openai should be a JSON string.
    const suggestions = JSON.parse(responseContent);

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/check-grammar' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
