import { ObjectId } from 'mongoose';
import { PostStatus, PostType } from '../enums/post.enum';

export interface Post {
    _id: ObjectId;
    memberId: ObjectId;
    postTitle: string;
    postBody: string;
    postType: PostType;
    postStatus: PostStatus;
    postImage?: string; 
    postViewCount: number;
    postLikeCount: number;
    postCommentCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface PostInput {
    memberId?: ObjectId;
    postTitle: string;
    postBody: string;
    postType: PostType;
    postStatus?: PostStatus;
    postImage?: string;
}

export interface PostUpdateInput {
    _id: ObjectId;
    postTitle?: string;
    postBody?: string;
    postType?: PostType;
    postStatus?: PostStatus;
    postImage?: string;   
}

export interface PostInquiry {
    order: string;
    page: number;
    limit: number;
    postType?: PostType;
    search?: string;
}