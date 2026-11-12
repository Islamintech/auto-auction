import api from "../../lib/api";
import { Post } from "../../lib/types/post";

class PostService {
  public async getAll(params?: { page?: number; limit?: number }): Promise<Post[]> {
    try {
      const result = await api.get("/post/all", { params });
      return result.data;
    } catch (err) {
      console.error("Error, PostService.getAll:", err);
      throw err;
    }
  }

  public async getById(id: string): Promise<Post> {
    try {
      const result = await api.get(`/post/${id}`);
      return result.data;
    } catch (err) {
      console.error("Error, PostService.getById:", err);
      throw err;
    }
  }

  public async like(id: string): Promise<Post> {
    try {
      const result = await api.post(`/post/${id}/like`);
      return result.data;
    } catch (err) {
      console.error("Error, PostService.like:", err);
      throw err;
    }
  }

  public async comment(id: string, commentContent: string): Promise<Post> {
    try {
      const result = await api.post(`/post/${id}/comment`, { commentContent });
      return result.data;
    } catch (err) {
      console.error("Error, PostService.comment:", err);
      throw err;
    }
  }
}

export default PostService;
