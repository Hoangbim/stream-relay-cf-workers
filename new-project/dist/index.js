// Export the DataStore class for Cloudflare Workers
export { DataStore } from './durable_objects/DataStore';
// Define allowed origins for CORS
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'https://biabip.bandia.vn',
    'https://bip.bandia.vn',
    // Add any other allowed origins here
];
// Generate CORS headers based on the request origin
function corsHeaders(requestOrigin) {
    // Get the origin from the request
    const origin = requestOrigin || '';
    // Log it for debugging
    console.log(`Main worker request origin: ${origin}`);
    // For maximum compatibility, respond with the requesting origin
    // This is safer than wildcard for credentials but allows any origin to make requests
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Origin, Accept, Referer, User-Agent',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin' // Important for caching with varying origins
    };
}
export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);
            // CORS handling
            if (request.method === 'OPTIONS') {
                return handleCORS(request);
            }
            // Documentation route
            if (url.pathname === '/docs') {
                // Remove the /docs from the URL before forwarding to DataStore
                const newRequest = new Request(new URL('/', url.origin).toString(), request);
                const id = env.DATA_STORE.idFromName('default');
                const dataStore = env.DATA_STORE.get(id);
                // Forward to the DataStore's /docs handler
                return await dataStore.fetch(new Request(new URL('/docs', url.origin).toString(), newRequest));
            }
            // Route all API requests to the DataStore Durable Object
            if (url.pathname.startsWith('/api')) {
                return handleAPI(request, env);
            }
            // Default route
            return new Response('Point Tracking System API', {
                headers: Object.assign({ 'Content-Type': 'text/plain' }, corsHeaders(request.headers.get('Origin') || undefined))
            });
        }
        catch (error) {
            // Properly handle unknown errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return new Response(`Error: ${errorMessage}`, { status: 500 });
        }
    }
};
// Handle CORS preflight requests
function handleCORS(request) {
    return new Response(null, {
        headers: corsHeaders(request.headers.get('Origin') || undefined)
    });
}
// Route API requests to DataStore Durable Object
async function handleAPI(request, env) {
    try {
        // Remove the /api prefix from the URL
        const url = new URL(request.url);
        const path = url.pathname.replace(/^\/api/, '');
        // Create a modified request with the new path
        const newRequest = new Request(new URL(path, url.origin).toString(), request);
        // Get or create a stub for the default DataStore
        const id = env.DATA_STORE.idFromName('default');
        const dataStore = env.DATA_STORE.get(id);
        // Forward the request to the DataStore
        const response = await dataStore.fetch(newRequest);
        // Add CORS headers to the response
        return addCorsHeaders(response, request.headers.get('Origin') || undefined);
    }
    catch (error) {
        // Properly handle unknown errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return new Response(`API Error: ${errorMessage}`, { status: 500 });
    }
}
// Add CORS headers to a response
function addCorsHeaders(response, origin) {
    const headers = new Headers(response.headers);
    // Apply CORS headers from the corsHeaders function
    Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        headers.set(key, value);
    });
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}
