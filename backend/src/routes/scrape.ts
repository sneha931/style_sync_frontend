import { Router } from 'express';
import { scrapeWebsite } from '../controllers/scrapeController.js';

const router = Router();


router.post('/', scrapeWebsite);

export default router;
