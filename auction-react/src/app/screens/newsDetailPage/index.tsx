import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CarPlaceholder from "../landingPage/CarPlaceholder";
import PostCard from "../newsPage/PostCard";
import { Post } from "../../../lib/types/post";
import PostService from "../../services/PostService";
import { serverApi } from "../../../lib/config";
import { imageUrl } from "../../../lib/api";
import { useGlobals } from "../../hooks/useGlobals";
import { sweetErrorHandling } from "../../../lib/sweetAlert";
import "../../../css/news.css";
import { formatDateTime } from "../../../lib/locale";

function imgUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${serverApi}/${path}`;
}

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const { t } = useTranslation();
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [liking, setLiking] = useState(false);
  const { authMember, openSignup } = useGlobals();

  const handleLike = async () => {
    if (!post || liking) return;
    if (!authMember) {
      openSignup();
      return;
    }
    const wasLiked = !!post.myFavorite;
    const willBeLiked = !wasLiked;
    setPost((prev) =>
      prev
        ? {
            ...prev,
            myFavorite: willBeLiked,
            postLikeCount: Math.max(0, (prev.postLikeCount ?? 0) + (willBeLiked ? 1 : -1)),
          }
        : prev
    );
    try {
      setLiking(true);
      const service = new PostService();
      const updated = await service.like(post._id);
      setPost((prev) =>
        prev ? { ...prev, ...updated, myFavorite: willBeLiked } : prev
      );
    } catch (err) {
      console.error(err);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              myFavorite: wasLiked,
              postLikeCount: Math.max(0, (prev.postLikeCount ?? 0) + (willBeLiked ? -1 : 1)),
            }
          : prev
      );
    } finally {
      setLiking(false);
    }
  };

  const handleComment = async () => {
    if (!post) return;
    if (!authMember) {
      openSignup();
      return;
    }
    const text = commentText.trim();
    if (!text) return;
    try {
      setPosting(true);
      const service = new PostService();
      await service.comment(post._id, text);
      setCommentText("");
      const fresh = await service.getById(post._id);
      setPost((prev) => (prev ? { ...prev, ...fresh, myFavorite: prev.myFavorite } : fresh));
    } catch (err) {
      console.error(err);
      sweetErrorHandling(err).then();
    } finally {
      setPosting(false);
    }
  };

  useEffect(() => {
    const service = new PostService();
    setLoading(true);
    setNotFound(false);
    service
      .getById(id)
      .then((data) => setPost(data))
      .catch((err) => {
        console.error(err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));

    service
      .getAll({ page: 1, limit: 20 })
      .then((data) => setRelated(data.filter((p) => p._id !== id).slice(0, 3)))
      .catch((err) => console.error(err));
  }, [id]);

  if (loading) {
    return <div className="news-detail"><div className="news-detail__missing">{t("news.loading")}</div></div>;
  }

  if (notFound || !post) {
    return (
      <div className="news-detail">
        <div className="news-detail__missing">
          {t("news.postNotFound")}
          <button className="news-detail__back" onClick={() => history.push("/news")}>
            {t("news.backToNews")}
          </button>
        </div>
      </div>
    );
  }

  const image = post.postImage ? imgUrl(post.postImage) : "";
  const date = post.createdAt ? post.createdAt.slice(0, 10) : "";
  const liked = !!post.myFavorite;

  return (
    <div className="news-detail">
      <div className="news-detail__crumb">
        <button className="news-detail__back" onClick={() => history.push("/news")}>
          {t("news.allPosts")}
        </button>
        <span>COMMUNITY / {post.postType.replace("_", " ")}</span>
      </div>

      <h1 className="news-detail__title">{post.postTitle}</h1>
      <div className="news-detail__meta">
        <span>{date}</span>
        <span>·</span>
        <span>{post.postCommentCount} {t("news.replies")}</span>
        <span>·</span>
        <span>{post.postViewCount} {t("news.views")}</span>
        <span>·</span>
        <span>{post.postLikeCount} {t("news.likes")}</span>
      </div>

      <div className="news-detail__hero">
        {image ? (
          <img
            src={image}
            alt={post.postTitle}
            style={{
              width: "100%",
              maxHeight: 520,
              objectFit: "cover",
              objectPosition: "center",
              borderRadius: 12,
              display: "block",
              background: "var(--surface, #f1ece1)",
            }}
          />
        ) : (
          <CarPlaceholder label={post.postType.replace("_", " ")} tone={post.postType.replace("_", " ")} height={360} />
        )}
      </div>

      <article className="news-detail__body" style={{ whiteSpace: "pre-wrap" }}>
        {post.postBody}
      </article>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24 }}>
        <button
          className={`cd-save${liked ? " cd-save--on" : ""}`}
          onClick={handleLike}
          disabled={liking}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <svg
            className="cd-save__icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <path d="M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9Z" />
          </svg>
        </button>
        <span style={{ fontSize: 13, opacity: 0.7 }}>{post.postLikeCount} {t("news.likes")}</span>
      </div>

      <section style={{ marginTop: 32 }}>
        <div style={{ fontSize: 12, fontFamily: "var(--mono-font)", letterSpacing: "0.18em", opacity: 0.6, marginBottom: 12 }}>
          {t("news.comments")} · {post.postCommentCount ?? 0}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleComment()}
            placeholder={authMember ? t("news.commentPh") : t("news.commentPhGuest")}
            disabled={!authMember || posting}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 6,
              border: "1px solid var(--rule, #2a2d34)",
              background: "transparent",
              color: "inherit",
              fontSize: 13,
            }}
          />
          <button
            onClick={authMember ? handleComment : openSignup}
            disabled={posting}
            style={{
              padding: "10px 18px",
              borderRadius: 6,
              border: "none",
              background: "#0b0c0e",
              color: "#e9e6dd",
              fontWeight: 600,
              letterSpacing: "0.05em",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {posting ? t("news.posting") : authMember ? t("news.post") : t("news.signup")}
          </button>
        </div>

        {post.comments && post.comments.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {post.comments.map((c, i) => {
              const avatar = imageUrl(c.memberImage);
              const cdate = c.createdAt
                ? formatDateTime(c.createdAt, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";
              return (
                <div
                  key={c._id || i}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: 12,
                    border: "1px solid var(--rule, #2a2d34)",
                    borderRadius: 8,
                  }}
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={c.memberNick}
                      style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "var(--rule, #2a2d34)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {(c.memberNick?.[0] || "?").toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{c.memberNick || t("news.member")}</span>
                      <span style={{ fontSize: 11, opacity: 0.5 }}>{cdate}</span>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.85 }}>{c.commentContent}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: "center", opacity: 0.5, fontSize: 12 }}>
            {t("news.noComments")}
          </div>
        )}
      </section>

      {related.length > 0 && (
        <div className="news-detail__related">
          <div className="news-detail__related-head">{t("news.morePosts")}</div>
          <div className="news__grid">
            {related.map((p) => (
              <PostCard
                key={p._id}
                post={p}
                onOpen={(rp) => history.push(`/news/${rp._id}`)}
                variant="card"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
