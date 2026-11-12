import express from 'express';
import importController from './controllers/import.controller';

/**
 * Service-to-service routes. Not used by the SPA or the admin panel; every
 * route requires the IMPORT_API_TOKEN bearer token.
 */
const routerInternal = express.Router();

routerInternal.use(importController.verifyImportToken);

routerInternal.post('/car/import', importController.importCar);

export default routerInternal;
