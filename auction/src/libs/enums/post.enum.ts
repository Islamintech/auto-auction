export enum PostType {
    FREE_BOARD = 'FREE_BOARD',
    NEWS = 'NEWS',
    ARTICLE = 'ARTICLE',
}

export enum PostStatus {
    // Written but not published. The public API only ever returns ACTIVE, so a
    // DRAFT post is invisible to visitors until an admin publishes it.
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    DELETE = 'DELETE',
}