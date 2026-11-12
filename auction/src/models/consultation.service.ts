import { ObjectId } from 'mongoose';
import { shapeIntoMongooseObjectId } from '../libs/config';
import Errors, { HttpCode, Message } from '../libs/Errors';
import {
    Consultation,
    ConsultationInput,
    ConsultationInquiry,
    ConsultationUpdateInput,
} from '../libs/types/consultation';
import ConsultationModel from '../schema/Consultation.model';
import { T } from '../libs/types/common';
import { ConsultationStatus } from '../libs/enums/consultation.enum';
import MemberService from './Member.service';

class ConsultationService {
    private readonly consultationModel;
    public memberService;

    constructor() {
        this.consultationModel = ConsultationModel;
        this.memberService = new MemberService();
    }

    /** SPA */

    public async createConsultation(input: ConsultationInput): Promise<Consultation> {
        try {
            const result = await this.consultationModel.create(input);

            // +10 points if logged in member
            if (input.memberId) {
                await this.memberService.addUserPoints(
                    { _id: input.memberId } as any, 10
                );

                // increment car consultation count
                const CarModel = (await import('../schema/Car.model')).default;
                await CarModel.findByIdAndUpdate(
                    input.carId,
                    { $inc: { carConsultationCount: 1 } }
                ).exec();
            }

            return result;
        } catch (err) {
            console.log('Error, createConsultation:', err);
            throw new Errors(HttpCode.BAD_REQUEST, Message.CREATED_FAILED);
        }
    }

    public async getMyConsultations(memberId: ObjectId): Promise<Consultation[]> {
     const result = await this.consultationModel
        .find({ memberId: memberId })
        .sort({ createdAt: -1 })
        .populate('carId', 'carTitle carBrand carPrice carImages')
        .lean()
        .exec() as Consultation[];

    return result; 
}

    /** SSR — Admin Panel */

    public async getConsultations(inquiry: ConsultationInquiry): Promise<Consultation[]> {
        const match: T = {};
        if (inquiry.status) match.status = inquiry.status;

        const result = await this.consultationModel
            .aggregate([
                { $match: match },
                { $sort: { createdAt: -1 } },
                { $skip: (inquiry.page * 1 - 1) * inquiry.limit },
                { $limit: inquiry.limit * 1 },
                {
                    $lookup: {
                        from: 'cars',
                        localField: 'carId',
                        foreignField: '_id',
                        as: 'carId',
                    },
                },
                { $unwind: { path: '$carId', preserveNullAndEmptyArrays: true } },
            ])
            .exec();

        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
        return result;
    }

    public async deleteChosenConsultation(id: string): Promise<Consultation> {
        const consultationId = shapeIntoMongooseObjectId(id);
        const result = await this.consultationModel
            .findByIdAndDelete(consultationId)
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATED_FAILED);
        return result;
    }

    public async updateChosenConsultation(
        id: string,
        input: ConsultationUpdateInput
    ): Promise<Consultation> {
        const consultationId = shapeIntoMongooseObjectId(id);
        const result = await this.consultationModel
            .findOneAndUpdate({ _id: consultationId }, input, { new: true })
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATED_FAILED);
        return result;
    }
}

export default ConsultationService;