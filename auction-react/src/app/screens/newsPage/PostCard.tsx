import React from "react";
import { useTranslation } from "react-i18next";
import CarPlaceholder from "../landingPage/CarPlaceholder";
import { Post } from "../../../lib/types/post";
import { serverApi } from "../../../lib/config";

interface Props {
  post: Post;
  onOpen: (post: Post) => void;
  variant?: "card" | "row" | "feature";
}

function imgUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${serverApi}/${path}`;
}

function formatDate(iso: string) {
  return iso ? iso.slice(0, 10) : "";
}

function excerptOf(body: string, len = 160) {
  if (!body) return "";
  return body.length > len ? body.slice(0, len).trim() + "…" : body;
}

export default function PostCard({ post, onOpen, variant = "card" }: Props) {
  const { t } = useTranslation();
  const image = post.postImage ? imgUrl(post.postImage) : "";

  const renderImage = (height: number, radius: number) =>
    image ? (
      <img
        src={image}
        alt={post.postTitle}
        style={{
          width: "100%",
          height,
          objectFit: "cover",
          objectPosition: "center",
          borderRadius: radius,
          display: "block",
          background: "var(--surface, #f1ece1)",
        }}
      />
    ) : (
      <CarPlaceholder label={post.postType.replace("_", " ")} tone={post.postType.replace("_", " ")} height={height} />
    );

  if (variant === "row") {
    return (
      <div className="news-row" onClick={() => onOpen(post)}>
        {renderImage(92, 8)}
        <div className="news-row__body">
          <div className="news-row__tag">{post.postType.replace("_", " ")}</div>
          <div className="news-row__title">{post.postTitle}</div>
          <div className="news-row__meta">
            <span>{formatDate(post.createdAt)}</span>
            <span>·</span>
            <span>{post.postCommentCount} {t("news.replies")}</span>
            <span>·</span>
            <span>{post.postViewCount} {t("news.views")}</span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "feature") {
    return (
      <div className="news-feature" onClick={() => onOpen(post)}>
        {renderImage(320, 12)}
        <div className="news-feature__body">
          <div className="news-feature__tag">{t("news.featured")} · {post.postType.replace("_", " ")}</div>
          <div className="news-feature__title">{post.postTitle}</div>
          <div className="news-feature__excerpt">{excerptOf(post.postBody)}</div>
          <div className="news-feature__meta">
            <span>{formatDate(post.createdAt)}</span>
            <span>·</span>
            <span>👁 {post.postViewCount} {t("news.views")}</span>
            <span>·</span>
            <span>♥ {post.postLikeCount} {t("news.likes")}</span>
            <span>·</span>
            <span>💬 {post.postCommentCount} {t("news.replies")}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="news-card" onClick={() => onOpen(post)}>
      {renderImage(150, 10)}
      <div className="news-card__body">
        <div className="news-card__tag">{post.postType.replace("_", " ")}</div>
        <div className="news-card__title">{post.postTitle}</div>
        <div className="news-card__excerpt">{excerptOf(post.postBody)}</div>
        <div className="news-card__meta">
          <span>{formatDate(post.createdAt)}</span>
          <span>👁 {post.postViewCount} · ♥ {post.postLikeCount} · 💬 {post.postCommentCount}</span>
        </div>
      </div>
    </div>
  );
}
