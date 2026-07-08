import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  clientUrls: process.env.CLIENT_URLS
    ? process.env.CLIENT_URLS.split(",").map((s) => s.trim())
    : ["http://localhost:8080", "http://localhost:5173", "http://127.0.0.1:8080"],
};
