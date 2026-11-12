import { Request, Response } from 'express';
import { T } from '../libs/types/common';
import { CarCondition, CarFuel, CarTransmission, CarType } from '../libs/enums/car.enum';

/**
 * Review queue for cars coming in from car-microservice (CKAuto ingestion).
 *
 * The browser only ever talks to this server, behind the normal admin session.
 * These handlers forward to the microservice's admin API and add its bearer
 * token server-side, so INGEST_ADMIN_TOKEN never reaches the page.
 */
const importsController: T = {};

const STATUSES = ['pending', 'approved', 'rejected', 'failed'];
// CKAuto codes look like "261113E010". Anything else is refused before it is
// put into an upstream URL.
const SOURCE_ID = /^[A-Za-z0-9_-]{1,40}$/;

const upstream = () => {
    const base = process.env.INGEST_API_URL?.trim();
    const token = process.env.INGEST_ADMIN_TOKEN?.trim();
    return base && token ? { base, token } : null;
};

async function forward(res: Response, method: 'GET' | 'POST', path: string, body?: unknown) {
    const cfg = upstream();
    if (!cfg) {
        return res.status(503).json({ message: 'Import service is not configured (INGEST_API_URL / INGEST_ADMIN_TOKEN)' });
    }
    try {
        const r = await fetch(new URL(path, cfg.base), {
            method,
            headers: {
                authorization: `Bearer ${cfg.token}`,
                ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(30_000),
        });
        const text = await r.text();
        let data: unknown;
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = { message: `Import service answered ${r.status} with a non-JSON body` };
        }
        // A 401 from upstream means *our* token is wrong, not that the admin is
        // logged out - say so, rather than passing on a misleading status.
        if (r.status === 401) {
            return res.status(502).json({ message: 'Import service rejected INGEST_ADMIN_TOKEN' });
        }
        res.status(r.status).json(data);
    } catch (err) {
        console.log('Error, imports forward:', err);
        res.status(502).json({ message: 'Import service is unreachable' });
    }
}

importsController.page = (_req: Request, res: Response) => {
    res.render('imports', {
        configured: Boolean(upstream()),
        carTypes: Object.values(CarType),
        carConditions: Object.values(CarCondition),
        carFuels: Object.values(CarFuel),
        carTransmissions: Object.values(CarTransmission),
    });
};

importsController.list = (req: Request, res: Response) => {
    const status = STATUSES.includes(String(req.query.status)) ? String(req.query.status) : 'pending';
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    return forward(res, 'GET', `/admin/vehicles?status=${status}&page=${page}&limit=20`);
};

importsController.detail = (req: Request, res: Response) => {
    const id = String(req.params.sourceId);
    if (!SOURCE_ID.test(id)) return res.status(400).json({ message: 'Invalid lot code' });
    return forward(res, 'GET', `/admin/vehicles/${id}`);
};

importsController.approve = (req: Request, res: Response) => {
    const id = String(req.params.sourceId);
    if (!SOURCE_ID.test(id)) return res.status(400).json({ message: 'Invalid lot code' });
    return forward(res, 'POST', `/admin/vehicles/${id}/approve`, req.body ?? {});
};

importsController.reject = (req: Request, res: Response) => {
    const id = String(req.params.sourceId);
    if (!SOURCE_ID.test(id)) return res.status(400).json({ message: 'Invalid lot code' });
    return forward(res, 'POST', `/admin/vehicles/${id}/reject`);
};

importsController.runNow = (_req: Request, res: Response) => forward(res, 'POST', '/admin/vehicles/run-now');

export default importsController;
