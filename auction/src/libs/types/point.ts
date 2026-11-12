import { ObjectId } from 'mongoose';
import { PointAction } from '../enums/point.enum';

export interface PointHistory {
    _id: ObjectId;
    memberId: ObjectId;
    action: PointAction;
    delta: number;
    refId?: ObjectId;
    createdAt: Date;
}

export interface PointHistoryInput {
    memberId: ObjectId;
    action: PointAction;
    delta: number;
    refId?: ObjectId;
}

export interface PointInquiry {
    page: number;
    limit: number;
    memberId: ObjectId;
} 