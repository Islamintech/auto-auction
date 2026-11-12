import express from 'express';
import path from 'path';
import router from './router';
import routerAdmin from './router-admin';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { MORGAN_FORMAT } from './libs/config';
import session from 'express-session';
import ConnectMongoDB from 'connect-mongodb-session';
import { T } from './libs/types/common';
import cors from 'cors';

const MongoDBStore = ConnectMongoDB(session);
const store = new MongoDBStore({
    uri: String(process.env.MONGO_URL),
    collection: 'sessions',
});

/** 1 - Entrance */
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('./uploads'));
app.get('/favicon.ico', (_req, res) => res.redirect('/img/favicon.png'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Comma-separated list of allowed origins in production; reflects any origin if unset (dev).
const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
app.use(cors({
    credentials: true,
    origin: allowedOrigins.length ? allowedOrigins : true,
}));
app.use(cookieParser());
app.use(morgan(MORGAN_FORMAT));

/** 2 - Sessions */
const isProd = process.env.NODE_ENV === 'production';
// Trust the full proxy chain (Railway/Render/Heroku can use several hops) so
// req.secure is derived from X-Forwarded-Proto. Without this, express-session
// sees the request as insecure and silently drops the `secure` session cookie,
// logging the user out on every refresh in production.
if (isProd) app.set('trust proxy', true);

app.use(
    session({
        secret: String(process.env.SESSION_SECRET || process.env.SECRET_TOKEN),
        cookie: {
            maxAge: 1000 * 3600 * 6,  // 6h
            httpOnly: true,
            secure: isProd,           // HTTPS-only cookie in production
            sameSite: isProd ? 'none' : 'lax',
        },
        store: store,
        resave: false,
        saveUninitialized: false,     // don't create sessions for anonymous visitors
    })
);

app.use(function (req, res, next) {
    const sessionInstance = req.session as T;
    res.locals.member = sessionInstance.member;
    next();
});

/** 3 - Views */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Resolves an image reference for <img src>. Cloudinary stores absolute https
// URLs; legacy/local uploads are relative paths that need a leading slash.
app.locals.imgUrl = (src: string) => {
    if (!src) return '';
    return /^https?:\/\//.test(src) ? src : '/' + src.replace(/^\/+/, '');
};

/** 4 - Routers */
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));  // load-balancer / uptime probe

// On the admin subdomain, send the bare domain straight to the admin panel.
const ADMIN_HOST = process.env.ADMIN_HOST || 'ziyo.autoauction.kr';
app.get('/', (req, res, next) => {
    if (req.hostname === ADMIN_HOST) return res.redirect('/admin');
    next();
});

app.use('/admin', routerAdmin);  // SSR
app.use('/', router);             // SPA

/** 5 - Error handling */
// 404 — no route matched
app.use((req, res) => {
    res.status(404).json({ message: 'Not found', path: req.originalUrl });
});

// Centralized error handler — keeps the process alive on thrown/rejected errors
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const code = err?.code && Number.isInteger(err.code) ? err.code : 500;
    const message = err?.message || 'Something went wrong!';
    if (code >= 500) console.error('Unhandled error:', err);
    res.status(code).json({ message });
});

export default app;