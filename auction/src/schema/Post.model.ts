import mongoose, { Schema } from 'mongoose';
import { PostStatus, PostType } from '../libs/enums/post.enum';

const postSchema = new Schema(
    {
        memberId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Member',
        },

        postTitle: {
            type: String,
            required: true,
        },

        postImage: {
            type: String,
        },

        postBody: {
            type: String,
            required: true,
        },

        postType: {
            type: String,
            enum: PostType,
            required: true,
        },

        postStatus: {
            type: String,
            enum: PostStatus,
            // Unpublished by default — publishing is an explicit admin decision.
            default: PostStatus.DRAFT,
        },

        postViewCount: {
            type: Number,
            default: 0,
        },

        postLikeCount: {
            type: Number,
            default: 0,
        },

        postCommentCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

postSchema.index({ memberId: 1 });
postSchema.index({ postType: 1, postStatus: 1 });

export default mongoose.model('Post', postSchema);