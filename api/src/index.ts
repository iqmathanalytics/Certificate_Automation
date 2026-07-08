import express from "express";
import cors from "cors";
import { env } from "./lib/env.js";
import { connectDatabase } from "./lib/prisma.js";
import certificateRoutes from "./routes/certificate-config.js";

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (env.nodeEnv === "development") {
        callback(null, true);
        return;
      }
      if (!origin || env.clientUrls.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "2mb" }));
app.use("/api", certificateRoutes);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

async function main() {
  await connectDatabase();
  app.listen(env.port, () => {
    console.log(`Certificate API running at http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
