import { Router, type IRouter } from "express";
import { GetMobileConfigResponse } from "@workspace/api-zod";
import { resolveAuthContext } from "../lib/auth-context";
import {
  configurationResponse,
  effectiveMobileConfiguration,
} from "../lib/mobile-config";
import { requireMobileAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get(
  "/mobile/config",
  requireMobileAuth,
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const context = await resolveAuthContext(request.currentUser!);
    if (context.customerId === null) {
      response.status(403).json({
        error: "CUSTOMER_SCOPE_REQUIRED",
        message: "A single active customer scope is required.",
      });
      return;
    }
    const configuration = await effectiveMobileConfiguration(context);
    response.json(GetMobileConfigResponse.parse(configurationResponse(configuration)));
  },
);

export default router;