import { shapeIntoMongooseObjectId } from '../libs/config';
import Errors, { HttpCode, Message } from '../libs/Errors';
import { Car, CarInput, CarInquiry, CarUpdateInput } from '../libs/types/car';
import CarModel from '../schema/Car.model';
import { T } from '../libs/types/common';
import mongoose, { ObjectId } from 'mongoose';
import ViewService from './View.service';
import { ViewInput } from '../libs/types/view';
import { ViewGroup } from '../libs/enums/view.enum';
import { CarStatus } from '../libs/enums/car.enum';
import PointService from './Point.service';
import { PointAction } from '../libs/enums/point.enum';
import LikeService from './Like.service';
import { LikeInput } from '../libs/types/like';
import { LikeGroup } from '../libs/enums/like.enum';

class CarService {
    private readonly carModel;
    public viewService;
    public pointService;
    public likeService;

    constructor() {
        this.carModel = CarModel;
        this.viewService = new ViewService();
        this.pointService = new PointService();
        this.likeService = new LikeService();
    }

    /** SPA */

    public async getCars(inquiry: CarInquiry): Promise<Car[]> {
        const match: T = { carStatus: CarStatus.ONSALE };

        if (inquiry.carBrand) match.carBrand = inquiry.carBrand;
        if (inquiry.search) match.carTitle = { $regex: new RegExp(inquiry.search, 'i') };

        const sort: T = inquiry.order === 'carPrice'
            ? { [inquiry.order]: 1 }
            : { [inquiry.order]: -1 };

        const result = await this.carModel
            .aggregate([
                { $match: match },
                { $sort: sort },
                { $skip: (inquiry.page * 1 - 1) * inquiry.limit },
                { $limit: inquiry.limit * 1 },
            ])
            .exec();

        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
        return result;
    }

    public async getCar(memberId: ObjectId | null, id: string): Promise<Car> {
        const carId = shapeIntoMongooseObjectId(id);

        const result = await this.carModel
            .findOne({ _id: carId, carStatus: CarStatus.ONSALE })
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

        if (memberId) {
            const input: ViewInput = {
                memberId: memberId,
                viewRefId: carId,
                viewGroup: ViewGroup.CAR,
            };

            const existView = await this.viewService.checkViewExistence(input);
            if (!existView) {
                await this.viewService.insertMemberView(input);
                await this.carModel
                    .findOneAndUpdate(
                        { _id: carId },
                        { $inc: { carViewCount: 1 } },
                        { new: true }
                    )
                    .exec();

                await this.pointService.awardPoints(
                    { _id: memberId } as any,
                    PointAction.VIEW_CAR,
                    carId
                );
            }

            // 👇 Attach myFavorite so React heart reflects server state
            const likeInput: LikeInput = {
                memberId,
                likeRefId: carId,
                likeGroup: LikeGroup.CAR,
            };
            const exists = await this.likeService.checkLikeExistence(likeInput);
            (result as any).myFavorite = exists.length > 0;
        }

        const CommentModel = (await import('../schema/Comment.model')).default;
        const comments = await CommentModel
            .find({ commentRefId: carId, commentGroup: 'CAR' })
            .sort({ createdAt: -1 })
            .populate('memberId', 'memberNick memberImage')
            .lean()
            .exec();

        (result as any).comments = comments.map((c: any) => ({
            _id: c._id,
            commentContent: c.commentContent,
            createdAt: c.createdAt,
            memberId: c.memberId?._id,
            memberNick: c.memberId?.memberNick,
            memberImage: c.memberId?.memberImage,
        }));

        return result;
    }

    public async likeCar(memberId: ObjectId, id: string): Promise<Car> {
        const carId = shapeIntoMongooseObjectId(id);

        const target = await this.carModel
            .findOne({ _id: carId, carStatus: CarStatus.ONSALE })
            .exec();
        if (!target) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

        const likeInput: LikeInput = {
            memberId,
            likeRefId: carId,
            likeGroup: LikeGroup.CAR,
        };
        const modifier = await this.likeService.toggleLike(likeInput);

        const result = await this.carModel
            .findByIdAndUpdate(
                carId,
                { $inc: { carLikeCount: modifier } },
                { new: true }
            )
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATED_FAILED);

        if (modifier === 1) {
            await this.pointService.awardPoints(
                { _id: memberId } as any,
                PointAction.LIKE_CAR,
                carId
            );
        }

        // 👇 Bonus: immediately reflect new favorite state in response
        (result as any).myFavorite = modifier === 1;

        return result;
    }

    public async commentCar(memberId: ObjectId, id: string, input: any): Promise<Car> {
        const carId = shapeIntoMongooseObjectId(id);

        const CommentModel = (await import('../schema/Comment.model')).default;
        await CommentModel.create({
            memberId,
            commentRefId: carId,
            commentGroup: 'CAR',
            commentContent: input.commentContent,
        });

        const result = await this.carModel
            .findOneAndUpdate(
                { _id: carId, carStatus: CarStatus.ONSALE },
                { $inc: { carCommentCount: 1 } },
                { new: true }
            )
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

        await this.pointService.awardPoints(
            { _id: memberId } as any,
            PointAction.COMMENT_CAR,
            carId
        );

        return result;
    }

    public async getCarByVin(vin: string): Promise<Car | null> {
        const normalized = vin.trim().toUpperCase();
        if (!normalized) return null;
        return await this.carModel.findOne({ carVin: normalized }).exec();
    }

    /** SSR — Admin Panel */

    public async getAllCars(): Promise<Car[]> {
        const result = await this.carModel.find().exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
        return result;
    }

    // A duplicate key can come from either unique index; `keyPattern` says which,
    // so the admin gets a message naming the field that actually clashed.
    private duplicateKeyError(err: any): Errors {
        return err?.keyPattern?.carVin
            ? new Errors(HttpCode.BAD_REQUEST, Message.DUPLICATE_VIN)
            : new Errors(HttpCode.BAD_REQUEST, Message.DUPLICATE_CAR);
    }

    public async createNewCar(input: CarInput): Promise<Car> {
        try {
            // The VIN field is optional, but an empty string is not "no VIN" — it is
            // a value, and the unique index would reject the second blank listing.
            // Drop it so the document simply has no carVin path.
            if (!String(input.carVin ?? '').trim()) delete input.carVin;

            return await this.carModel.create(input);
        } catch (err: any) {
            console.log('Error, createNewCar:', err);
            if (err?.code === 11000) throw this.duplicateKeyError(err);
            throw new Errors(HttpCode.BAD_REQUEST, Message.CREATED_FAILED);
        }
    }

    public async updateChosenCar(id: string, input: CarUpdateInput): Promise<Car> {
        if (!mongoose.isValidObjectId(id))
            throw new Errors(HttpCode.BAD_REQUEST, Message.NO_DATA_FOUND);
        const carId = shapeIntoMongooseObjectId(id);

        // Build $set from the submitted fields only. `_id` is never writable, and
        // `undefined` keys are dropped so a partial edit cannot blank other fields.
        const { _id, ...rest } = input as T;
        const set: T = {};
        for (const [key, value] of Object.entries(rest)) {
            if (value === undefined) continue;
            set[key] = value;
        }

        // Numeric/text coercion — the admin panel posts everything as strings.
        if (set.carPrice !== undefined) set.carPrice = String(set.carPrice).trim();
        if (set.carMileage !== undefined) set.carMileage = Number(set.carMileage);
        if (set.salePrice !== undefined && set.salePrice !== '')
            set.salePrice = Number(set.salePrice);
        if (set.saleDate) set.saleDate = new Date(set.saleDate);

        if (Number.isNaN(set.carMileage) || Number.isNaN(set.salePrice))
            throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATED_FAILED);

        const update: T = { $set: set };

        // Clearing the VIN has to remove the path, not store "" — the partial unique
        // index covers every string, so two blank VINs would collide.
        if (set.carVin !== undefined) {
            const vin = String(set.carVin).trim().toUpperCase();
            if (vin) set.carVin = vin;
            else {
                delete set.carVin;
                update.$unset = { ...(update.$unset ?? {}), carVin: '' };
            }
        }

        if (set.carStatus && set.carStatus !== CarStatus.SOLD) {
            // Clear sale details when a car is no longer marked as sold. Deleting
            // them from $set first avoids a conflicting-path update error.
            delete set.buyerName;
            delete set.salePrice;
            delete set.saleDate;
            update.$unset = {
                ...(update.$unset ?? {}),
                buyerName: '',
                salePrice: '',
                saleDate: '',
            };
        }

        try {
            const result = await this.carModel
                .findOneAndUpdate({ _id: carId }, update, {
                    new: true,
                    runValidators: true,
                })
                .exec();
            // A missing document is a 404 — 304 strips the response body, so the
            // admin panel could never show why the update failed.
            if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
            return result;
        } catch (err: any) {
            if (err instanceof Errors) throw err;
            if (err?.code === 11000) throw this.duplicateKeyError(err);
            throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATED_FAILED);
        }
    }

    public async deleteChosenCar(id: string): Promise<Car> {
        const carId = shapeIntoMongooseObjectId(id);
        const result = await this.carModel
            .findByIdAndDelete({ _id: carId })
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATED_FAILED);
        return result;
    }
}

export default CarService;
