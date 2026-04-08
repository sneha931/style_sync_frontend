import { Router } from 'express';
import {
  editTokens,
  getLatestTokens,
  getTokenHistory,
  setTokenLocks,
} from '../controllers/tokensController.js';

const router = Router();


router.get('/', getLatestTokens);


router.patch('/', editTokens);


router.patch('/locks', setTokenLocks);


router.get('/history', getTokenHistory);

export default router;
