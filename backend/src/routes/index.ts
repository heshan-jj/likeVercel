import { Router } from 'express';
import authRoutes from './auth';
import vpsRoutes from './vps';
import fileRoutes from './files';
import processRoutes from './processes';
import portRoutes from './ports';
import proxyRoutes from './proxy';
import keyRoutes from './keys';
import envRoutes from './env';

const router = Router();

// Note: Rate limiting for auth is handled in the main app before mounting this router
// or can be handled here if we move the limiter.
router.use('/auth', authRoutes);
router.use('/vps', vpsRoutes);
router.use('/vps', fileRoutes);
router.use('/vps', processRoutes);
router.use('/vps', portRoutes);
router.use('/vps', proxyRoutes);
router.use('/keys', keyRoutes);
router.use('/vps', envRoutes);

export default router;
