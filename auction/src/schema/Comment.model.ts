import mongoose, { Schema } from 'mongoose';

const commentSchema = new Schema(
    {
        memberId:       { type: Schema.Types.ObjectId, required: true, ref: 'Member' },
        commentRefId:   { type: Schema.Types.ObjectId, required: true },
        commentGroup:   { type: String, enum: ['CAR', 'POST'], required: true },
        commentContent: { type: String, required: true },
    },
    { timestamps: true }
);

commentSchema.index({ commentRefId: 1, createdAt: -1 });

export default mongoose.model('Comment', commentSchema);
