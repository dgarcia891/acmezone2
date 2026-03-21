import { JWT } from "https://esm.sh/google-auth-library@9.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const credsStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    const propertyId = Deno.env.get('GA_PROPERTY_ID');

    if (!credsStr || !propertyId) {
      throw new Error('Missing environment variables: GOOGLE_SERVICE_ACCOUNT_JSON or GA_PROPERTY_ID');
    }

    const credentials = JSON.parse(credsStr);
    
    // Auth with Google
    const client = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    const token = await client.authorize();
    const accessToken = token.access_token;

    // GA4 Data API endpoint
    const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

    const fetchReport = async (body: any) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('GA Data API Error:', err);
        throw new Error(`GA Data API error: ${response.status} ${err}`);
      }
      return response.json();
    };

    // 1. Fetch Overview (Views and Users for last 7 days)
    const overviewReport = await fetchReport({
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'sessions' }
      ],
      dimensions: [{ name: 'date' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }]
    });

    // 2. Fetch Top Pages
    const topPagesReport = await fetchReport({
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' }
      ],
      limit: 10,
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }]
    });

    // 3. Fetch Custom Events (Button Clicks)
    const eventsReport = await fetchReport({
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        notExpression: {
          filter: {
            fieldName: 'eventName',
            inListFilter: {
              values: ['page_view', 'session_start', 'first_visit', 'user_engagement', 'scroll']
            }
          }
        }
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }]
    });

    return new Response(
      JSON.stringify({
        overview: overviewReport,
        topPages: topPagesReport,
        events: eventsReport,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('GA Analytics Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
