import { MemberStatus, MemberType } from "../enums/member.enum";

export interface Member {
    _id: string;
    memberType: MemberType;
    memberStatus: MemberStatus;
    memberNick: string;
    memberPhone: string;
    memberPassword?: string;
    memberImage?: string;
    memberEmail?: string;
    memberAddress?: string;
    memberDesc?: string;
    memberPoints: number;
    memberCountry?: string;
    memberTelegram?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface MemberInput {
    memberType?: MemberType;
    memberStatus?: MemberStatus;
    memberNick: string;
    memberPhone: string;
    memberPassword: string;
    memberImage?: string;
    memberEmail?: string;
    memberAddress?: string;
    memberDesc?: string;
    memberPoints?: number;
    memberCountry?: string;
    memberTelegram?: string;
}

export interface LoginInput {
    memberNick: string;
    memberPassword: string;
}

export interface MemberUpdateInput {
    _id: string;
    memberStatus?: MemberStatus;
    memberNick?: string;
    memberPhone?: string;
    memberPassword?: string;
    memberImage?: string | File;
    memberEmail?: string;
    memberAddress?: string;
    memberCountry?: string;
    memberTelegram?: string;
    memberDesc?: string;
}
