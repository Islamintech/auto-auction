import Errors, { HttpCode, Message } from '../libs/Errors';
import { Like, LikeInput, MeLiked } from '../libs/types/like';
import { T } from '../libs/types/common';
import LikeModel from '../schema/Like.model';

class LikeService {
    private readonly likeModel;

    constructor() {
        this.likeModel = LikeModel;
    }

    public async toggleLike(input: LikeInput): Promise<number> {
        const search: T = { memberId: input.memberId, likeRefId: input.likeRefId };
        const exist = await this.likeModel.findOne(search).exec();
        let modifier = 1;

        if (exist) {
            await this.likeModel.findOneAndDelete(search).exec();
            modifier = -1;
        } else {
            try {
                await this.likeModel.create(input);
            } catch (err) {
                console.log('Error, Like.service.toggleLike:', err);
                throw new Errors(HttpCode.BAD_REQUEST, Message.CREATED_FAILED);
            }
        }
        console.log(`- Like modifier ${modifier} -`);
        return modifier;
    }

    public async checkLikeExistence(input: LikeInput): Promise<MeLiked[]> {
        const { memberId, likeRefId } = input;
        const result = await this.likeModel
            .findOne({ memberId, likeRefId })
            .exec();
        return result
            ? [{ memberId, likeRefId, myFavorite: true }]
            : [];
    }
}

export default LikeService;
