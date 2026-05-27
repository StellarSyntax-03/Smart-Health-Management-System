import express from "express";
import cors from "cors";
import { env, validateEnv } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import patientRoutes from "./routes/patient/index.js";
import doctorRoutes from "./routes/doctor/index.js";
import aiRoutes from "./routes/ai/index.js";

validateEnv();

const app = express();

app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "10mb" }));

app.use("/api/patient", patientRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/ai", aiRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    ...(env.NODE_ENV === "development" && { environment: env.NODE_ENV }),
  });
});

app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Backend running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
});
