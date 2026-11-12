/**
 * One-time migration: hide every post that is currently public.
 *
 * Posts used to default to ACTIVE, so anything ever created is live on the site.
 * The default is now DRAFT and publishing is an explicit admin action — this
 * brings existing rows in line with that.
 *
 *   node scripts/unpublish-existing-posts.js          # report only (read-only)
 *   node scripts/unpublish-existing-posts.js --apply  # ACTIVE -> DRAFT
 *
 * Only ACTIVE posts are touched. DELETE stays DELETE (unpublishing a deleted post
 * would resurrect it into your drafts), and existing DRAFT rows are left alone.
 * Re-publishing later is one click per post in the admin Visibility column.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');

async function main() {
    if (!process.env.MONGO_URL) {
        console.error('MONGO_URL is not set. Add it to .env first.');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URL, {});
    const posts = mongoose.connection.db.collection('posts');

    const counts = await posts
        .aggregate([{ $group: { _id: '$postStatus', count: { $sum: 1 } } }, { $sort: { _id: 1 } }])
        .toArray();

    console.log('\nCurrent post visibility:');
    counts.forEach((c) => console.log(`  ${String(c._id ?? '(unset)').padEnd(10)} ${c.count}`));

    const active = await posts
        .find({ postStatus: 'ACTIVE' })
        .project({ _id: 1, postTitle: 1, postType: 1 })
        .toArray();

    console.log(`\nPublic posts that would be hidden: ${active.length}`);
    active.forEach((p) =>
        console.log(`  ${p._id}  ${(p.postType ?? '?').padEnd(11)} ${p.postTitle ?? '(untitled)'}`)
    );

    // A post with no postStatus at all also reads as public via the schema default
    // it was created under, so surface those too.
    const unset = await posts.countDocuments({ postStatus: { $exists: false } });
    if (unset) console.log(`\nPosts with no postStatus field: ${unset} (will be set to DRAFT)`);

    if (!active.length && !unset) {
        console.log('\nNothing to do — no public posts.');
    } else if (APPLY) {
        const res = await posts.updateMany(
            { $or: [{ postStatus: 'ACTIVE' }, { postStatus: { $exists: false } }] },
            { $set: { postStatus: 'DRAFT' } }
        );
        console.log(`\nHid ${res.modifiedCount} post(s). All posts are now drafts.`);
    } else {
        console.log('\nRead-only run. Re-run with --apply to hide them.');
    }

    await mongoose.connection.close();
}

main().catch(async (err) => {
    console.error('unpublish-existing-posts failed:', err);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
});
