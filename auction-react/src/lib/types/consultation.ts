export type PreferredContact = "WHATSAPP" | "TELEGRAM" | "EMAIL" | "CALL";

export type ConsultationStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";

export interface ConsultationInput {
  carId: string;
  name: string;
  email: string;
  phone: string;
  preferredContact: PreferredContact;
  message?: string;
}

export interface PopulatedCar {
  _id: string;
  carTitle?: string;
  carBrand?: string;
  carPrice?: number;
  carImages?: string[];
  title?: string;
  brand?: string;
  price?: number;
  images?: string[];
  image?: string;
}

export interface Consultation {
  _id: string;
  carId: string | PopulatedCar;
  memberId?: string;
  name: string;
  email: string;
  phone: string;
  preferredContact: PreferredContact;
  message?: string;
  status: ConsultationStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}
