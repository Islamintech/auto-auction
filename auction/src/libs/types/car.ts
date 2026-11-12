import { ObjectId } from "mongoose";
import { CarCondition, CarFuel, CarStatus, CarTransmission, CarType } from "../enums/car.enum";

export interface Car {
    _id: ObjectId;
    carStatus: CarStatus;
    carTitle: string;
    carVin?: string;
    buyerName?: string;
    salePrice?: number;
    saleDate?: Date;
    carBrand: string;
    carModel?: string;
    carType: CarType;
    carCondition: CarCondition;
    carFuel?: CarFuel;
    carTransmission?: CarTransmission;
    carYear: string;
    carMileage: number;
    carPrice: string;
    carColor?: string;
    carDesc?: string;
    carImages: string[];
    importSource?: string;
    importId?: string;
    carViewCount: number;
    carLikeCount: number;
    carCommentCount: number;
    carConsultationCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CarInput {
    carStatus?: CarStatus;
    carTitle: string;
    carVin?: string;
    carBrand: string;
    carModel?: string;
    carType: CarType;
    carCondition: CarCondition;
    carFuel?: CarFuel;
    carTransmission?: CarTransmission;
    carYear: string;
    carMileage: number;
    carPrice: string;
    carColor?: string;
    carDesc?: string;
    carImages: string[];
    importSource?: string;
    importId?: string;
}

export interface CarUpdateInput {
    _id: ObjectId;
    carStatus?: CarStatus;
    carTitle?: string;
    carVin?: string;
    buyerName?: string;
    salePrice?: number;
    saleDate?: Date | string;
    carBrand?: string;
    carModel?: string;
    carType?: CarType;
    carCondition?: CarCondition;
    carFuel?: CarFuel;
    carTransmission?: CarTransmission;
    carYear?: string;
    carMileage?: number;
    carPrice?: string;
    carColor?: string;
    carDesc?: string;
    carImages?: string[];
}

export interface CarInquiry {
    order: string;
    page: number;
    limit: number;
    carBrand?: string;
    carType?: CarType;
    carCondition?: CarCondition;
    carStatus?: CarStatus;
    search?: string;
}
