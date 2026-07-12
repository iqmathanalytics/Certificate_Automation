import express from "express";
import cors from "cors";
import { env } from "./lib/env.js";
import { connectDatabase } from "./lib/prisma.js";
import certificateRoutes from "./routes/certificate-config.js";
import batchRoutes from "./routes/batches.js";
import templateRoutes from "./routes/templates.js";
import emailRoutes from "./routes/email.js";
import authRoutes from "./routes/auth.js";
import { seedDefaultTemplate } from "./lib/seed-templates.js";

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
app.use("/api", authRoutes);
app.use("/api", batchRoutes);
app.use("/api", certificateRoutes);
app.use("/api", templateRoutes);
app.use("/api", emailRoutes);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

async function main() {
  await connectDatabase();
  await seedDefaultTemplate();
  app.listen(env.port, () => {
    console.log(`Certificate API running at http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
