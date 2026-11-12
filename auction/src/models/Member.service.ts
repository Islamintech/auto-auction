import MemberModel from '../schema/Member.model';
import { LoginInput, Member, MemberInput, MemberUpdateInput } from '../libs/types/member';
import Errors, { HttpCode, Message } from '../libs/Errors';
import { MemberStatus, MemberType } from '../libs/enums/member.enum';
import * as bcrypt from 'bcryptjs';
import { shapeIntoMongooseObjectId } from '../libs/config';
import mongoose from 'mongoose';
import { T } from '../libs/types/common';

/**
 * Fields a client is allowed to set on its own account.
 *
 * memberType, memberStatus and memberPoints are deliberately absent: they are
 * privilege and reward state owned by the server. TypeScript interfaces do not
 * filter anything at runtime — req.body is whatever the caller sent — so the
 * allowlist has to be explicit, or a signup carrying "memberType": "ADMIN"
 * creates an admin.
 */
const SIGNUP_FIELDS = [
    'memberNick',
    'memberPhone',
    'memberPassword',
    'memberEmail',
    'memberImage',
    'memberDesc',
    'memberAddress',
    'memberCountry',
    'memberTelegram',
] as const;

/**
 * Same idea for profile edits. memberPassword is excluded as well: this route
 * never hashed it, so accepting one would store plaintext and permanently break
 * that account's login. Changing a password needs its own endpoint.
 */
const PROFILE_FIELDS = [
    'memberNick',
    'memberPhone',
    'memberEmail',
    'memberImage',
    'memberDesc',
    'memberAddress',
    'memberCountry',
    'memberTelegram',
] as const;

/** Cost-matched stand-in so a missing account is not detectably faster. */
const DUMMY_HASH = bcrypt.hashSync('cost-matching-placeholder', 10);

const MIN_PASSWORD_LENGTH = 8;

const pickAllowed = (source: any, allowed: readonly string[]): T => {
    const out: T = {};
    for (const key of allowed) {
        const value = source?.[key];
        if (value !== undefined && value !== null && value !== '') out[key] = value;
    }
    return out;
};

class MemberService {
    private readonly memberModel;

    constructor() {
        this.memberModel = MemberModel;
    }

    /** SPA */

    public async signup(input: MemberInput): Promise<Member> {
        const data = pickAllowed(input, SIGNUP_FIELDS);

        // Validated here rather than trusting the browser: the API is public and
        // the client's checks are only a convenience.
        if (!data.memberNick || !data.memberPhone || !data.memberPassword)
            throw new Errors(HttpCode.BAD_REQUEST, Message.MISSING_SIGNUP_FIELDS);
        if (String(data.memberPassword).length < MIN_PASSWORD_LENGTH)
            throw new Errors(HttpCode.BAD_REQUEST, Message.WEAK_PASSWORD);

        const salt = await bcrypt.genSalt();
        data.memberPassword = await bcrypt.hash(String(data.memberPassword), salt);

        // Set the privileged fields explicitly rather than leaning on schema
        // defaults, so they are pinned regardless of what the caller sent.
        data.memberType = MemberType.USER;
        data.memberStatus = MemberStatus.ACTIVE;
        data.memberPoints = 0;

        try {
            const result = await this.memberModel.create(data);
            const member = result.toJSON();
            // Drop the hash rather than blanking it — assigning '' left the key
            // in the response body.
            delete (member as T).memberPassword;
            return member;
        } catch (err: any) {
            console.error('Error, signup:', err);
            // Previously every failure reported USED_NICK_PHONE, so a validation
            // error looked like a duplicate account.
            if (err?.code === 11000) {
                const field = Object.keys(err.keyPattern ?? {})[0];
                throw new Errors(
                    HttpCode.BAD_REQUEST,
                    field === 'memberEmail' ? Message.USED_EMAIL : Message.USED_NICK_PHONE
                );
            }
            throw new Errors(HttpCode.BAD_REQUEST, Message.CREATED_FAILED);
        }
    }

    public async login(input: LoginInput): Promise<Member> {
        const member = await this.memberModel
            .findOne(
                { memberNick: input.memberNick, memberStatus: { $ne: MemberStatus.DELETE } },
                { _id: 1, memberNick: 1, memberPassword: 1, memberStatus: 1 }
            )
            .exec();

        // Unknown nickname and wrong password return the same 401. Distinct
        // replies (404 "No member with that nickname" vs 401 "Wrong password")
        // let anyone enumerate which accounts exist. Hash a throwaway value when
        // there is no member so both paths cost roughly the same time.
        if (!member) {
            await bcrypt.compare(String(input.memberPassword ?? ''), DUMMY_HASH);
            throw new Errors(HttpCode.UNAUTHIRIZED, Message.INVALID_CREDENTIALS);
        }
        if (member.memberStatus === MemberStatus.BANNED)
            throw new Errors(HttpCode.FORBIDDEN, Message.BLOCKED_USER);

        const isMatch = await bcrypt.compare(
            String(input.memberPassword ?? ''),
            member.memberPassword
        );
        if (!isMatch)
            throw new Errors(HttpCode.UNAUTHIRIZED, Message.INVALID_CREDENTIALS);

        return await this.memberModel.findById(member._id).lean().exec();
    }

    /**
     * Resolves the member behind a token on every authenticated request.
     *
     * The token carries only an id, so identity is re-read here rather than
     * trusted from the payload. That also makes bans effective immediately:
     * previously req.member came straight from the JWT, so a banned or deleted
     * account kept full access until the token expired, up to AUTH_TIMER hours.
     */
    public async getAuthenticatedMember(id: string): Promise<Member | null> {
        if (!mongoose.isValidObjectId(id)) return null;
        return await this.memberModel
            .findOne({ _id: shapeIntoMongooseObjectId(id), memberStatus: MemberStatus.ACTIVE })
            .lean<Member>()
            .exec();
    }

    public async getMemberDetail(member: Member): Promise<Member> {
        const memberId = shapeIntoMongooseObjectId(member._id);
        const result = await this.memberModel
            .findOne({ _id: memberId, memberStatus: MemberStatus.ACTIVE })
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
        return result;
    }

    public async updateMember(member: Member, input: MemberUpdateInput): Promise<Member> {
        const memberId = shapeIntoMongooseObjectId(member._id);

        // Only profile fields, and only ever on the caller's own account: the id
        // comes from the verified token, never from the request body. Iterating
        // Object.keys(input) previously copied whatever was posted, which let a
        // signed-in user grant themselves memberType ADMIN.
        const cleaned = pickAllowed(input, PROFILE_FIELDS);

        const result = await this.memberModel
            .findByIdAndUpdate(memberId, cleaned, { new: true, runValidators: true })
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATED_FAILED);
        return result;
    }

    /**
     * No longer exposed over HTTP — the public leaderboard that used it was
     * removed. Kept for internal/admin use, but now projected down to display
     * fields only: it previously returned full member documents (phone, email),
     * so anything re-exposing it stays safe by default.
     */
    public async getTopUsers(): Promise<Member[]> {
        const result = await this.memberModel
            .find({
                memberStatus: MemberStatus.ACTIVE,
                memberPoints: { $gte: 1 },
            })
            .select('memberNick memberImage memberPoints')
            .sort({ memberPoints: 'desc' })  // desc — highest points first
            .limit(5)                          // top 5 for leaderboard
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
        return result;
    }

    public async addUserPoints(member: Member, point: number): Promise<Member> {
        const memberId = shapeIntoMongooseObjectId(member._id);
        return await this.memberModel
            .findOneAndUpdate(
                {
                    _id: memberId,
                    memberType: MemberType.USER,
                    memberStatus: MemberStatus.ACTIVE,
                },
                { $inc: { memberPoints: point } },
                { new: true }
            )
            .exec();
    }

    /** SSR — Admin Panel */

    public async processSignup(input: MemberInput): Promise<Member> {
    const existingAdmin = await this.memberModel
        .findOne({ memberType: MemberType.ADMIN })
        .exec();

    if (existingAdmin) 
        throw new Errors(HttpCode.BAD_REQUEST, Message.CREATED_FAILED);

    const data = pickAllowed(input, SIGNUP_FIELDS);
    if (!data.memberPassword)
        throw new Errors(HttpCode.BAD_REQUEST, Message.CREATED_FAILED);

    const salt = await bcrypt.genSalt();
    data.memberPassword = await bcrypt.hash(String(data.memberPassword), salt);

    // ADMIN is granted here by the server, never taken from the request body.
    // This route is only reachable while no admin exists (guarded above).
    data.memberType = MemberType.ADMIN;
    data.memberStatus = MemberStatus.ACTIVE;
    data.memberPoints = 0;

    try {
        const result = await this.memberModel.create(data);
        return result;
    } catch (err) {
        throw new Errors(HttpCode.BAD_REQUEST, Message.ADMIN_EXIST);
    }
}

    public async processLogin(input: LoginInput): Promise<Member> {
        const member = await this.memberModel
            .findOne(
                { memberNick: input.memberNick, memberType: MemberType.ADMIN },
                { _id: 1, memberNick: 1, memberPassword: 1 }
            )
            .exec();
            
        // Same single message as the SPA login, so the admin panel cannot be
        // used to probe which nicknames exist.
        if (!member) {
            await bcrypt.compare(String(input.memberPassword ?? ''), DUMMY_HASH);
            throw new Errors(HttpCode.UNAUTHIRIZED, Message.INVALID_CREDENTIALS);
        }

        const isMatch = await bcrypt.compare(
            String(input.memberPassword ?? ''),
            member.memberPassword
        );
        if (!isMatch)
            throw new Errors(HttpCode.UNAUTHIRIZED, Message.INVALID_CREDENTIALS);

        return await this.memberModel.findById(member._id).exec();
    }

    public async getMembers(): Promise<Member[]> {
        const result = await this.memberModel
            .find({ memberType: MemberType.USER })
            .exec();
        return result;
    }

    public async updateChosenUser(input: MemberUpdateInput): Promise<Member> {
        input._id = shapeIntoMongooseObjectId(input._id);
        const result = await this.memberModel
            .findByIdAndUpdate(
                { _id: input._id },
                input,
                { new: true, runValidators: true }
            )
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATED_FAILED);
        return result;
    }

    // stubs — implement in their own service files
    public async getConsultations(query: any): Promise<any[]> { return []; }
    public async updateChosenConsultation(id: string, input: any): Promise<any> { return {}; }
    public async getPosts(): Promise<any[]> { return []; }
    public async deleteChosenPost(id: string): Promise<any> { return {}; }
    public async getQnas(): Promise<any[]> { return []; }
    public async answerQna(id: string, input: any): Promise<any> { return {}; }
}

export default MemberService;