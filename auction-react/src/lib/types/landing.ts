export type CarCategory = "ready" | "crashed";

export interface CarComment {
  _id?: string;
  memberId?: string;
  memberNick?: string;
  memberImage?: string;
  commentContent: string;
  createdAt?: string;
}

export interface AuctionCar {
  id: string;
  /* Some endpoints (e.g. VIN verify) return the raw Mongo `_id`. */
  _id?: string;
  title: string;
  brand: string;
  myFavorite?: boolean;
  comments?: CarComment[];
  category: CarCategory;
  year: number;
  km: number;
  /** Admin-entered KRW amount; a string that may be a range ("30,000,000-35,000,000"). */
  price: string | number;
  color: string;
  desc: string;
  damage?: string;
  damageDesc?: string;
  image: string;
  images: string[];
  status: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  consultationCount: number;
  vin?: string;
  sold?: boolean;
  buyerName?: string;
  salePrice?: number;
  soldAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LandingPageState {
  cars: AuctionCar[];
  savedIds: string[];
}
