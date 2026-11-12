import mongoose, { Schema } from 'mongoose';
import { MemberStatus, MemberType } from '../libs/enums/member.enum';

const memberSchema = new Schema({
    memberType: {
        type: String,
        enum: Object.values(MemberType),
        default: MemberType.USER,
    },

    memberStatus: {
        type: String,
        enum: Object.values(MemberStatus),
        default: MemberStatus.ACTIVE,
    },

    memberNick: {
        type: String,
        index: { unique: true, sparse: true },
        required: true,
    },

    memberPhone: {
        type: String,
        index: { unique: true, sparse: true },
        required: true,
    },

    memberPassword: {
        type: String,
        select: false,
        required: true,
    },

    memberEmail: {
        type: String,
        index: { unique: true, sparse: true },
    },

    memberImage: {
        type: String,
    },

    memberAddress: {
        type: String,
    },

    memberDesc: {
        type: String,
    },

    memberPoints: {
        type: Number,
        default: 0,
    },

    memberCountry: {
        type: String,
    },

    memberTelegram: {
        type: String,
    },

}, { timestamps: true });

export default mongoose.model('Member', memberSchema);