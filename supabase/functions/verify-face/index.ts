import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { capturedImage, userId, action } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Register new face
    if (action === 'register') {
      const { error } = await supabase
        .from('admin_face_auth')
        .upsert({ 
          user_id: userId, 
          face_image_data: capturedImage 
        });

      if (error) {
        console.error('Face registration error:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Face registered successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify face
    if (action === 'verify') {
      const { data: faceData, error: fetchError } = await supabase
        .from('admin_face_auth')
        .select('face_image_data')
        .eq('user_id', userId)
        .single();

      if (fetchError || !faceData) {
        console.error('Face data not found:', fetchError);
        return new Response(
          JSON.stringify({ success: false, message: 'No registered face found. Please register your face first.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use Lovable AI to compare faces
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY not configured');
      }

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'You are a face verification system. Compare two face images and determine if they show the same person. Respond with only "MATCH" if the faces belong to the same person, or "NO_MATCH" if they are different people. Consider facial features, structure, and unique characteristics. Be strict in your verification.'
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Are these two images of the same person? First image (registered):' },
                { type: 'image_url', image_url: { url: faceData.face_image_data } },
                { type: 'text', text: 'Second image (current attempt):' },
                { type: 'image_url', image_url: { url: capturedImage } }
              ]
            }
          ],
          max_tokens: 10,
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ success: false, message: 'Rate limit exceeded. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (aiResponse.status === 402) {
          return new Response(
            JSON.stringify({ success: false, message: 'AI service unavailable. Please contact support.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error('AI verification failed');
      }

      const aiResult = await aiResponse.json();
      const verificationResult = aiResult.choices?.[0]?.message?.content?.trim().toUpperCase();
      
      console.log('Face verification result:', verificationResult);

      const isMatch = verificationResult?.includes('MATCH') && !verificationResult?.includes('NO_MATCH');

      return new Response(
        JSON.stringify({ 
          success: isMatch,
          message: isMatch ? 'Face verified successfully' : 'Face verification failed. Please try again.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Face verification error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || 'Face verification failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
