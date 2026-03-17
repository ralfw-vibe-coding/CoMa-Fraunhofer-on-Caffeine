import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import express from "express";
import { createAppEventStore } from "./event-store/createAppEventStore.ts";
import { DeregisterParticipantCommandProcessor } from "./processors/DeregisterParticipantCommandProcessor.ts";
import { ListParticipantsQueryProcessor } from "./processors/ListParticipantsQueryProcessor.ts";
import { ListWhoIsNextToBuyCoffeeQueryProcessor } from "./processors/ListWhoIsNextToBuyCoffeeQueryProcessor.ts";
import { RecordCoffeeDrawnCommandProcessor } from "./processors/RecordCoffeeDrawnCommandProcessor.ts";
import { RecordCoffeePurchasedCommandProcessor } from "./processors/RecordCoffeePurchasedCommandProcessor.ts";
import { RecordCoffeeSupplyDepletedCommandProcessor } from "./processors/RecordCoffeeSupplyDepletedCommandProcessor.ts";
import { RegisterParticipantCommandProcessor } from "./processors/RegisterParticipantCommandProcessor.ts";

async function bootstrap() {
  const app = express();
  const port = Number(process.env.PORT ?? 3001);
  const appEventStore = await createAppEventStore();
  const distDirectory = path.resolve(process.cwd(), "dist");
  const indexHtmlPath = path.join(distDirectory, "index.html");
  const hasBuiltFrontend = fs.existsSync(indexHtmlPath);

  const registerParticipantCommandProcessor = new RegisterParticipantCommandProcessor(
    appEventStore.eventStore,
  );
  const deregisterParticipantCommandProcessor =
    new DeregisterParticipantCommandProcessor(appEventStore.eventStore);
  const recordCoffeeDrawnCommandProcessor = new RecordCoffeeDrawnCommandProcessor(
    appEventStore.eventStore,
  );
  const recordCoffeePurchasedCommandProcessor =
    new RecordCoffeePurchasedCommandProcessor(appEventStore.eventStore);
  const recordCoffeeSupplyDepletedCommandProcessor =
    new RecordCoffeeSupplyDepletedCommandProcessor(appEventStore.eventStore);
  const listParticipantsQueryProcessor = new ListParticipantsQueryProcessor(
    appEventStore.eventStore,
  );
  const listWhoIsNextToBuyCoffeeQueryProcessor =
    new ListWhoIsNextToBuyCoffeeQueryProcessor(appEventStore.eventStore);

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      backend: appEventStore.backend,
    });
  });

  app.get("/api/participants", async (_request, response, next) => {
    try {
      response.json(await listParticipantsQueryProcessor.process());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/ranking", async (_request, response, next) => {
    try {
      response.json(await listWhoIsNextToBuyCoffeeQueryProcessor.process());
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/participants/register", async (request, response, next) => {
    try {
      const result = await registerParticipantCommandProcessor.process(request.body);
      response.status(result.status ? 201 : 400).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/participants/deregister", async (request, response, next) => {
    try {
      const result = await deregisterParticipantCommandProcessor.process(request.body);
      response.status(result.status ? 200 : 400).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/coffee/drawn", async (request, response, next) => {
    try {
      const result = await recordCoffeeDrawnCommandProcessor.process(request.body);
      response.status(result.status ? 201 : 400).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/coffee/purchased", async (request, response, next) => {
    try {
      const result = await recordCoffeePurchasedCommandProcessor.process(request.body);
      response.status(result.status ? 201 : 400).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/coffee/supply-depleted", async (request, response, next) => {
    try {
      const result = await recordCoffeeSupplyDepletedCommandProcessor.process(
        request.body ?? {},
      );
      response.status(result.status ? 201 : 400).json(result);
    } catch (error) {
      next(error);
    }
  });

  if (hasBuiltFrontend) {
    app.use(express.static(distDirectory));

    app.get("*", (request, response, next) => {
      if (request.path.startsWith("/api/")) {
        next();
        return;
      }

      response.sendFile(indexHtmlPath);
    });
  }

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(error);
      response.status(500).json({
        status: false,
        message: "Interner Serverfehler.",
      });
    },
  );

  const server = app.listen(port, () => {
    console.log(`CoMa-Backend läuft auf http://localhost:${port}`);
  });

  async function shutdown() {
    server.close(async () => {
      await appEventStore.close();
      process.exit(0);
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
