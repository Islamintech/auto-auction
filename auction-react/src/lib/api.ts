import axios from "axios";
import { serverApi } from "./config";

const api = axios.create({
  baseURL: serverApi,
  withCredentials: true,
});

// When the server rejects us as unauthenticated, the local session is stale —
// clear it and send the user back to a fresh state.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && localStorage.getItem("memberData")) {
      localStorage.removeItem("memberData");
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export function imageUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${serverApi}/${path}`;
}

export default api;
