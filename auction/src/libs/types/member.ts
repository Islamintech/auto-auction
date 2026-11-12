import { Session } from "express-session";
import { MemberStatus, MemberType } from "../enums/member.enum";
import { Request } from "express";
import { ObjectId } from 'mongoose';

export interface Member {
    _id: ObjectId;
    memberType: MemberType;
    memberStatus: MemberStatus;
    memberNick: string;
    memberPhone: string;
    memberPassword?: string;
    memberEmail?: string;
    memberImage?: string;
    memberDesc?: string;
    memberAddress?: string;
    memberCountry?: string;
    memberTelegram?: string;
    memberPoints: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface MemberInput {
    memberType?: MemberType;
    memberStatus?: MemberStatus;
    memberNick: string;
    memberPhone: string;
    memberPassword: string;
    memberEmail?: string;
    memberImage?: string;
    memberDesc?: string;
    memberAddress?: string;
    memberCountry?: string;
    memberTelegram?: string;
    memberPoints?: number;
}

export interface LoginInput {
    memberNick: string;
    memberPassword: string;
}

export interface MemberUpdateInput {
    _id: ObjectId;
    memberStatus?: MemberStatus;
    memberNick?: string;
    memberPhone?: string;
    memberPassword?: string;
    memberEmail?: string;
    memberImage?: string;
    memberAddress?: string;
    memberCountry?: string;
    memberTelegram?: string;
    memberDesc?: string;
}

export interface ExtendedRequest extends Request {
    member: Member;
    file: Express.Multer.File;
    files: Express.Multer.File[];
}

export interface AdminRequest extends Request {
    member: Member;
    session: Session & { member: Member };
    file: Express.Multer.File;
    files: Express.Multer.File[];
}