import mongoose, { Schema } from 'mongoose';
import { ConsultationStatus, PreferredContact } from '../libs/enums/consultation.enum';

const consultationSchema = new Schema(
    {
        carId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Car',
        },

        memberId: {
            type: Schema.Types.ObjectId,
            ref: 'Member',
        },

        name: {
            type: String,
            required: true,
        },

        email: {
            type: String,
            required: true,
        },

        phone: {
            type: String,
            required: true,
        },

        preferredContact: {
            type: String,
            enum: PreferredContact,
            required: true,
        },

        message: {
            type: String,
        },

        status: {
            type: String,
            enum: ConsultationStatus,
            default: ConsultationStatus.PENDING,
        },

        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'Member',
        },

        adminNote: {
            type: String,
        },
    },
    { timestamps: true }
);

consultationSchema.index({ carId: 1 });
consultationSchema.index({ memberId: 1 });
consultationSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Consultation', consultationSchema);