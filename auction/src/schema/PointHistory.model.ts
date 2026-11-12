import mongoose, { Schema } from 'mongoose';
import { PointAction } from '../libs/enums/point.enum';

const pointHistorySchema = new Schema(
    {
        memberId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Member',
        },

        action: {
            type: String,
            enum: PointAction,
            required: true,
        },

        delta: {
            type: Number,
            required: true,
        },

        refId: {
            type: Schema.Types.ObjectId,
        },
    },
    { timestamps: true }
);

pointHistorySchema.index({ memberId: 1 });
pointHistorySchema.index({ memberId: 1, createdAt: -1 });

export default mongoose.model('PointHistory', pointHistorySchema);