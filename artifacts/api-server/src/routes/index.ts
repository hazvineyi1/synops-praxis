import { Router } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import partnersRouter from "./partners";
import organisationsRouter from "./organisations";
import brandRouter from "./brand";
import coursesRouter from "./courses";
import modulesRouter from "./modules";
import beatsRouter from "./beats";
import studioRouter from "./studio";
import sessionsRouter from "./sessions";
import assessmentsRouter from "./assessments";
import credentialsRouter from "./credentials";
import coachRouter from "./coach";
import analyticsRouter from "./analytics";
import reportsRouter from "./reports";

const router = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(partnersRouter);
router.use(organisationsRouter);
router.use(brandRouter);
router.use(coursesRouter);
router.use(modulesRouter);
router.use(beatsRouter);
router.use(studioRouter);
router.use(sessionsRouter);
router.use(assessmentsRouter);
router.use(credentialsRouter);
router.use(coachRouter);
router.use(analyticsRouter);
router.use(reportsRouter);

export default router;
