import { ObjectId } from 'mongoose';
import { shapeIntoMongooseObjectId } from '../libs/config';
import Errors, { HttpCode, Message } from '../libs/Errors';
import { Post, PostInput, PostInquiry, PostUpdateInput } from '../libs/types/post';
import PostModel from '../schema/Post.model';
import { T } from '../libs/types/common';
import { PostStatus } from '../libs/enums/post.enum';
import ViewService from './View.service';
import { ViewInput } from '../libs/types/view';
import { ViewGroup } from '../libs/enums/view.enum';
import MemberService from './Member.service';
import LikeService from './Like.service';
import { LikeInput } from '../libs/types/like';
import { LikeGroup } from '../libs/enums/like.enum';

class PostService {
    private readonly postModel;
    public viewService;
    public memberService;
    public likeService;

    constructor() {
        this.postModel = PostModel;
        this.viewService = new ViewService();
        this.memberService = new MemberService();
        this.likeService = new LikeService();
    }

    /** SPA */

    public async getPosts(inquiry: PostInquiry): Promise<Post[]> {
        const match: T = { postStatus: PostStatus.ACTIVE };

        if (inquiry.postType) match.postType = inquiry.postType;
        if (inquiry.search) match.postTitle = { $regex: new RegExp(inquiry.search, 'i') };

        const sort: T = { [inquiry.order]: -1 };

        const result = await this.postModel
            .aggregate([
                { $match: match },
                { $sort: sort },
                { $skip: (inquiry.page * 1 - 1) * inquiry.limit },
                { $limit: inquiry.limit * 1 },
            ])
            .exec();

        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
        return result;
    }

    public async getPost(memberId: ObjectId | null, id: string): Promise<Post> {
        const postId = shapeIntoMongooseObjectId(id);

        const result = await this.postModel
            .findOne({ _id: postId, postStatus: PostStatus.ACTIVE })
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

        if (memberId) {
            const input: ViewInput = {
                memberId: memberId,
                viewRefId: postId,
                viewGroup: ViewGroup.POST,
            };

            const existView = await this.viewService.checkViewExistence(input);
            if (!existView) {
                await this.viewService.insertMemberView(input);
                await this.postModel
                    .findOneAndUpdate(
                        { _id: postId },
                        { $inc: { postViewCount: 1 } },
                        { new: true }
                    )
                    .exec();
            }

            const exists = await this.likeService.checkLikeExistence({
                memberId,
                likeRefId: postId,
                likeGroup: LikeGroup.POST,
            });
            (result as any).myFavorite = exists.length > 0;
        }

        const CommentModel = (await import('../schema/Comment.model')).default;
        const comments = await CommentModel
            .find({ commentRefId: postId, commentGroup: 'POST' })
            .sort({ createdAt: -1 })
            .populate('memberId', 'memberNick memberImage')
            .lean()
            .exec();

        (result as any).comments = comments.map((c: any) => ({
            _id: c._id,
            commentContent: c.commentContent,
            createdAt: c.createdAt,
            memberId: c.memberId?._id,
            memberNick: c.memberId?.memberNick,
            memberImage: c.memberId?.memberImage,
        }));

        return result;
    }

    public async createPost(memberId: ObjectId, input: PostInput): Promise<Post> {
        input.memberId = memberId;
        try {
            const result = await this.postModel.create(input);
            // +10 points for creating a post
            await this.memberService.addUserPoints({ _id: memberId } as any, 10);
            return result;
        } catch (err) {
            console.log('Error, createPost:', err);
            throw new Errors(HttpCode.BAD_REQUEST, Message.CREATED_FAILED);
        }
    }

    public async likePost(memberId: ObjectId, id: string): Promise<Post> {
        const postId = shapeIntoMongooseObjectId(id);

        const target = await this.postModel
            .findOne({ _id: postId, postStatus: PostStatus.ACTIVE })
            .exec();
        if (!target) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

        const likeInput: LikeInput = {
            memberId,
            likeRefId: postId,
            likeGroup: LikeGroup.POST,
        };
        const modifier = await this.likeService.toggleLike(likeInput);

        const result = await this.postModel
            .findByIdAndUpdate(
                postId,
                { $inc: { postLikeCount: modifier } },
                { new: true }
            )
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATED_FAILED);

        if (modifier === 1) {
            await this.memberService.addUserPoints({ _id: memberId } as any, 4);
        }

        (result as any).myFavorite = modifier === 1;
        return result;
    }

    public async commentPost(memberId: ObjectId, id: string, input: any): Promise<Post> {
        const postId = shapeIntoMongooseObjectId(id);

        const CommentModel = (await import('../schema/Comment.model')).default;
        await CommentModel.create({
            memberId,
            commentRefId: postId,
            commentGroup: 'POST',
            commentContent: input.commentContent,
        });

        const result = await this.postModel
            .findOneAndUpdate(
                { _id: postId, postStatus: PostStatus.ACTIVE },
                { $inc: { postCommentCount: 1 } },
                { new: true }
            )
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

        // +4 points for commenting on a post
        await this.memberService.addUserPoints({ _id: memberId } as any, 4);
        return result;
    }

    /** SSR — Admin Panel */

    public async getAllPosts(): Promise<Post[]> {
        const result = await this.postModel.find().exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
        return result;
    }

    public async deleteChosenPost(id: string): Promise<Post> {
        const postId = shapeIntoMongooseObjectId(id);
        const result = await this.postModel
            .findByIdAndDelete(postId)
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATED_FAILED);
        return result;
    }

    public async updateChosenPost(id: string, input: PostUpdateInput): Promise<Post> {
        const postId = shapeIntoMongooseObjectId(id);
        const result = await this.postModel
            .findOneAndUpdate({ _id: postId }, input, { new: true })
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATED_FAILED);
        return result;
    }
}

export default PostService;