import { ObjectId } from 'mongoose';
import { ConsultationStatus, PreferredContact } from '../enums/consultation.enum';

export interface Consultation {
    _id: ObjectId;
    carId: ObjectId;
    memberId?: ObjectId;
    name: string;
    email: string;
    phone: string;
    preferredContact: PreferredContact;
    message?: string;
    status: ConsultationStatus;
    assignedTo?: ObjectId;
    adminNote?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ConsultationInput {
    carId: ObjectId;
    memberId?: ObjectId;
    name: string;
    email: string;
    phone: string;
    preferredContact: PreferredContact;
    message?: string;
}

export interface ConsultationUpdateInput {
    _id: ObjectId;
    status?: ConsultationStatus;
    assignedTo?: ObjectId;
    adminNote?: string;
}

export interface ConsultationInquiry {
    page: number;
    limit: number;
    status?: ConsultationStatus;
}