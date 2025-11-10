const setDefault = (key: string, fallback: string) => {
  if (!process.env[key] || process.env[key] === "") {
    process.env[key] = fallback;
  }
};

process.env.NODE_ENV = "test";

setDefault("JWT_SECRET", "system-test-secret");
setDefault("DB_HOST", process.env.TEST_DB_HOST ?? "127.0.0.1");
setDefault("DB_USER", process.env.TEST_DB_USER ?? "root");
setDefault("DB_PASSWORD", process.env.TEST_DB_PASSWORD ?? "password");
setDefault("DB_NAME", process.env.TEST_DB_NAME ?? "seminario_system_test");
setDefault("DB_PORT", process.env.TEST_DB_PORT ?? "3306");
setDefault("DB_POOL_MAX", process.env.DB_POOL_MAX ?? "5");
setDefault("DB_POOL_MIN", process.env.DB_POOL_MIN ?? "0");
setDefault("DB_POOL_ACQUIRE", process.env.DB_POOL_ACQUIRE ?? "30000");
setDefault("DB_POOL_IDLE", process.env.DB_POOL_IDLE ?? "10000");

export {};