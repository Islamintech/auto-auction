import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import app from './app';

/** Fail fast if critical configuration is missing. */
const required = ['MONGO_URL'];
const missing = required.filter((key) => !process.env[key]);
if (!process.env.SESSION_SECRET && !process.env.SECRET_TOKEN) {
    missing.push('SESSION_SECRET (or SECRET_TOKEN)');
}
if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}

/** Don't let an unexpected error silently leave the process in a bad state. */
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    process.exit(1);
});

mongoose
    .connect(process.env.MONGO_URL as string, {})
    .then(async () => {
        console.log('MongoDB connection succeed');

        // Mongoose builds indexes in the background and swallows the error, so a
        // unique index that cannot be created (pre-existing duplicates) would leave
        // the app running with no constraint at all. Report it loudly instead.
        // `npm run check:vins` lists the offending documents.
        try {
            const CarModel = (await import('./schema/Car.model')).default;
            await CarModel.ensureIndexes();
        } catch (err) {
            console.error(
                'WARNING: car index build failed — duplicates likely exist. ' +
                    'Run `npm run check:vins` to list them.',
                err
            );
        }
        const PORT = process.env.PORT ?? 3000;
        const server = app.listen(PORT, function () {
            console.log(`The server is running successfully on http://localhost:${PORT} \n`);
            console.info(`The admin is running successfully on http://localhost:${PORT}/admin`);
        });

        /** Graceful shutdown so in-flight requests finish before exit (SIGTERM from Docker/orchestrators). */
        const shutdown = (signal: string) => {
            console.log(`${signal} received, shutting down gracefully...`);
            server.close(() => {
                mongoose.connection.close(false).finally(() => process.exit(0));
            });
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    })
    .catch((err) => {
        console.error('ERROR on connection MongoDB', err);
        process.exit(1);
    });
