import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import SectionHeader from "./SectionHeader";
import CarPlaceholder from "./CarPlaceholder";
import { useTranslation } from "react-i18next";
import PostService from "../../services/PostService";
import { Post } from "../../../lib/types/post";
import { imageUrl } from "../../../lib/api";
import { formatDate } from "../../../lib/locale";

export default function CommunityGrid({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  const history = useHistory();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const service = new PostService();
    service
      .getAll({ page: 1, limit: 4 })
      .then((data) => setPosts(data.slice(0, 4)))
      .catch((err) => console.error(err));
  }, []);

  const goPost = (p: Post) => history.push(`/news/${p._id}`);

  return (
    <div>
      <SectionHeader
        number="04"
        title={t("sections.community")}
        subtitle={t("sections.communitySub")}
        link={t("sections.allPosts")}
        onLink={onOpen}
      />
      <div className="landing-comm">
        {posts.length === 0 && (
          <div style={{ padding: 20, opacity: 0.6 }}>{t("news.noPosts")}</div>
        )}
        {posts.map((p) => {
          const img = imageUrl(p.postImage);
          const date = p.createdAt
            ? formatDate(p.createdAt, { month: "short", day: "numeric" }).toUpperCase()
            : "";
          return (
            <div key={p._id} className="landing-comm__card" onClick={() => goPost(p)}>
              {img ? (
                <img
                  src={img}
                  alt={p.postTitle}
                  style={{
                    width: "100%",
                    height: 120,
                    objectFit: "cover",
                    objectPosition: "center",
                    borderRadius: 8,
                    display: "block",
                    background: "var(--surface, #f1ece1)",
                  }}
                />
              ) : (
                <CarPlaceholder label={p.postType.replace("_", " ")} tone={p.postType} height={120} />
              )}
              <div className="landing-comm__body">
                <div className="landing-comm__tag">{p.postType.replace("_", " ")}</div>
                <div className="landing-comm__title">{p.postTitle}</div>
                <div className="landing-comm__meta">
                  <span className="landing-comm__metaitem">
                    <FavoriteBorderIcon sx={{ fontSize: 13 }} />
                    {p.postLikeCount}
                  </span>
                  <span className="landing-comm__metaitem">
                    <ChatBubbleOutlineIcon sx={{ fontSize: 13 }} />
                    {p.postCommentCount}
                  </span>
                  <span className="landing-comm__date">{date}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
