import { ObjectId } from 'mongoose';
import { shapeIntoMongooseObjectId } from '../libs/config';
import Errors, { HttpCode, Message } from '../libs/Errors';
import { PointHistory, PointHistoryInput, PointInquiry } from '../libs/types/point';
import { PointAction, PointValue } from '../libs/enums/point.enum';
import PointHistoryModel from '../schema/PointHistory.model';
import MemberService from './Member.service';
import { Member } from '../libs/types/member';

class PointService {
    private readonly pointHistoryModel;
    public memberService;

    constructor() {
        this.pointHistoryModel = PointHistoryModel;
        this.memberService = new MemberService();
    }

    /** Award points and save history */
    public async awardPoints(
        member: Member,
        action: PointAction,
        refId?: ObjectId
    ): Promise<void> {
        const delta = PointValue[action];

        // save to history
        const input: PointHistoryInput = {
            memberId: member._id,
            action,
            delta,
            refId,
        };
        await this.pointHistoryModel.create(input);

        // update member total
        await this.memberService.addUserPoints(member, delta);
    }

    /** Get my points history */
    public async getPointsHistory(inquiry: PointInquiry): Promise<PointHistory[]> {
        const memberId = shapeIntoMongooseObjectId(inquiry.memberId);

        const result = await this.pointHistoryModel
            .find({ memberId })
            .sort({ createdAt: -1 })
            .skip((inquiry.page - 1) * inquiry.limit)
            .limit(inquiry.limit)
            .exec();

        return result as PointHistory[];
    }

    /** Leaderboard — top 5 */
    public async getLeaderboard(): Promise<Member[]> {
        return await this.memberService.getTopUsers();
    }

    /** Check daily login — award only once per day */
    public async checkDailyLogin(member: Member): Promise<void> {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const alreadyAwarded = await this.pointHistoryModel
            .findOne({
                memberId: member._id,
                action: PointAction.DAILY_LOGIN,
                createdAt: { $gte: startOfDay },
            })
            .exec();

        if (!alreadyAwarded) {
            await this.awardPoints(member, PointAction.DAILY_LOGIN);
        }
    }
}

export default PointService;