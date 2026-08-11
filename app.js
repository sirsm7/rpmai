// Access configuration from global scope
const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Make client available globally for Web Components
window.appDb = supabaseClient;

// Simple Event Bus for inter-component communication
window.appEvents = {
    trigger: function(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        window.dispatchEvent(event);
    },
    listen: function(eventName, callback) {
        window.addEventListener(eventName, callback);
    }
};

console.log('App initialized. Supabase client ready.');