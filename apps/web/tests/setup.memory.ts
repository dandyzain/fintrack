// Unit/API tests always use the in-memory store.
delete process.env.DATABASE_URL;
delete process.env.DIRECT_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.OPENAI_API_KEY;
process.env.SESSION_SECRET = "test-session-secret-that-is-long-enough-1234567890";
process.env.ENABLE_MOCK_AI = "true";
