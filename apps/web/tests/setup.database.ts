const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is required for integration tests.");
if (!/test/i.test(new URL(url).pathname)) {
  throw new Error("Refusing to run: TEST_DATABASE_URL must point to a database whose name contains 'test' (it is wiped).");
}
process.env.DATABASE_URL = url;
process.env.DIRECT_URL = url;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.OPENAI_API_KEY;
process.env.SESSION_SECRET = "test-session-secret-that-is-long-enough-1234567890";
process.env.ENABLE_MOCK_AI = "true";
