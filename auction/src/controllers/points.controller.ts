import { Request, Response } from 'express';
import Errors, { HttpCode } from '../libs/Errors';
import { T } from '../libs/types/common';
import PointService from '../models/Point.service';
import { ExtendedRequest } from '../libs/types/member';
import { PointInquiry } from '../libs/types/point';

const pointService = new PointService();
const pointsController: T = {};

pointsController.getPointsHistory = async (req: ExtendedRequest, res: Response) => {
    try {
        console.log('getPointsHistory');
        const { page, limit } = req.query;

        const inquiry: PointInquiry = {
            memberId: req.member._id,
            page: Number(page) || 1,
            limit: Number(limit) || 10,
        };

        const result = await pointService.getPointsHistory(inquiry);
        res.status(HttpCode.OK).json(result);
    } catch (err) {
        console.log('Error, getPointsHistory:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

pointsController.getLeaderboard = async (req: Request, res: Response) => {
    try {
        console.log('getLeaderboard');
        const result = await pointService.getLeaderboard();
        res.status(HttpCode.OK).json(result);
    } catch (err) {
        console.log('Error, getLeaderboard:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

export default pointsController;
