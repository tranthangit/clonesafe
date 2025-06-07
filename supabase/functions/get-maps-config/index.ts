import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Getting Goong API keys from environment...');
    
    const goongMapsApiKey = Deno.env.get('GOONG_MAPS_API_KEY');
    const goongApiKey = Deno.env.get('GOONG_API_KEY');
    
    if (!goongMapsApiKey || !goongApiKey) {
      console.error('Goong API keys not found in environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration Error',
          details: 'Goong API keys are not properly configured. Please set GOONG_MAPS_API_KEY and GOONG_API_KEY environment variables.'
        }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Successfully retrieved Goong API keys');
    return new Response(
      JSON.stringify({ 
        goongMapsApiKey: goongMapsApiKey.trim(),
        goongApiKey: goongApiKey.trim()
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-maps-config function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});