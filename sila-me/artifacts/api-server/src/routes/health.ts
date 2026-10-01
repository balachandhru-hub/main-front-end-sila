import { Router, type IRouter } from "express";
import {
  GetVersionResponse,
  HealthCheckResponse,
  ServiceHealthResponse,
} from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health", async (request, response): Promise<void> => {
  try {
    await pool.query("SELECT 1");
    response.json(
      ServiceHealthResponse.parse({ status: "OK", database: "CONNECTED" }),
    );
  } catch (error) {
    request.log.error({ error }, "Database health check failed");
    response.status(503).json(
      ServiceHealthResponse.parse({
        status: "DEGRADED",
        database: "UNAVAILABLE",
      }),
    );
  }
});

router.get("/version", (_request, response): void => {
  response.json(
    GetVersionResponse.parse({
      service: "SILA Backend",
      version: process.env.SILA_BACKEND_VERSION ?? "0.2.0",
    }),
  );
});

export default router;
