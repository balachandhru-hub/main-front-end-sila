import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import adminRouter from "./admin";
import mobileRouter from "./mobile";
import masterDataRouter from "./master-data";
import operationalRouter from "./operational";
import invoicesRouter from "./invoices";
import userAdministrationRouter from "./user-administration";
import { requireCloudAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(userAdministrationRouter);
router.use((request, response, next) => {
  if (request.path.startsWith("/users")) {
    return requireCloudAuth(request, response, next);
  }
  return next();
});
router.use(usersRouter);
router.use("/admin", requireCloudAuth);
router.use(adminRouter);
router.use(mobileRouter);
router.use(masterDataRouter);
router.use(operationalRouter);
router.use(invoicesRouter);
export default router;
