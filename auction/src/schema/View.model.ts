import mongoose, { Schema } from 'mongoose';
import { ViewGroup } from '../libs/enums/view.enum';

const viewSchema = new Schema({
    viewGroup: {
        type: String,
        enum: ViewGroup,
        required: true,
    },

    memberId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Member',
    },

    viewRefId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
}, { timestamps: true });

// prevents same member viewing same item twice
viewSchema.index({ memberId: 1, viewRefId: 1 }, { unique: true });

export default mongoose.model('View', viewSchema);