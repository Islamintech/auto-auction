export type PostType = "NEWS" | "ARTICLE" | "FREE_BOARD";

export interface PostComment {
  _id?: string;
  memberId?: string;
  memberNick?: string;
  memberImage?: string;
  commentContent: string;
  createdAt?: string;
}

export interface Post {
  _id: string;
  memberId: string;
  postTitle: string;
  postImage: string;
  postBody: string;
  postType: PostType;
  postStatus: string;
  postViewCount: number;
  postLikeCount: number;
  postCommentCount: number;
  myFavorite?: boolean;
  comments?: PostComment[];
  createdAt: string;
  updatedAt: string;
}
