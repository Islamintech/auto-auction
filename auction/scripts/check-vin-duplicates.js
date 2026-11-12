/**
 * Pre-flight check for the unique index on Car.carVin.
 *
 * MongoDB refuses to build a unique index while duplicate values exist, and
 * Mongoose's autoIndex failure is easy to miss in startup logs — the app keeps
 * running with no index. Run this before deploying the index change:
 *
 *   node scripts/check-vin-duplicates.js          # report only (read-only)
 *   node scripts/check-vin-duplicates.js --fix    # unset blank/whitespace VINs
 *
 * `--fix` only ever clears VINs that are empty or whitespace, because those carry
 * no information. Real duplicated VINs are NOT touched: two listings claiming the
 * same vehicle is a data question only you can answer (which one is correct?), so
 * they are reported for manual review.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const FIX = process.argv.includes('--fix');

async function main() {
    if (!process.env.MONGO_URL) {
        console.error('MONGO_URL is not set. Add it to .env first.');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URL, {});
    const cars = mongoose.connection.db.collection('cars');

    // 1) Blank strings — these collide with each other under the partial index.
    const blanks = await cars
        .find({ carVin: { $type: 'string', $regex: /^\s*$/ } })
        .project({ _id: 1, carTitle: 1 })
        .toArray();

    console.log(`\nBlank carVin values: ${blanks.length}`);
    blanks.forEach((c) => console.log(`  ${c._id}  ${c.carTitle ?? '(untitled)'}`));

    if (blanks.length && FIX) {
        const res = await cars.updateMany(
            { carVin: { $type: 'string', $regex: /^\s*$/ } },
            { $unset: { carVin: '' } }
        );
        console.log(`  -> cleared ${res.modifiedCount} blank VIN(s)`);
    } else if (blanks.length) {
        console.log('  -> re-run with --fix to clear these');
    }

    // 2) Genuine duplicates — same non-empty VIN on more than one car.
    const dupes = await cars
        .aggregate([
            { $match: { carVin: { $type: 'string', $not: /^\s*$/ } } },
            {
                $group: {
                    _id: { $toUpper: '$carVin' },
                    count: { $sum: 1 },
                    cars: { $push: { _id: '$_id', carTitle: '$carTitle', carStatus: '$carStatus' } },
                },
            },
            { $match: { count: { $gt: 1 } } },
            { $sort: { count: -1 } },
        ])
        .toArray();

    console.log(`\nDuplicated VINs: ${dupes.length}`);
    dupes.forEach((d) => {
        console.log(`  ${d._id} — ${d.count} cars:`);
        d.cars.forEach((c) =>
            console.log(`      ${c._id}  ${c.carStatus ?? '?'}  ${c.carTitle ?? '(untitled)'}`)
        );
    });

    const blocking = dupes.length > 0 || (blanks.length > 0 && !FIX);
    if (blocking) {
        console.log(
            '\nThe unique index CANNOT be built yet. Resolve the entries above first.'
        );
    } else {
        console.log('\nNo conflicts — the unique index on carVin can be built.');
    }

    await mongoose.connection.close();
    process.exit(blocking ? 1 : 0);
}

main().catch(async (err) => {
    console.error('check-vin-duplicates failed:', err);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
});
