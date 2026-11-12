import { Request, Response } from 'express';
import Errors, { HttpCode, Message } from '../libs/Errors';
import { T } from '../libs/types/common';
import ConsultationService from '../models/consultation.service';
import { ExtendedRequest } from '../libs/types/member';
import { ConsultationInput } from '../libs/types/consultation';

const consultationService = new ConsultationService();
const consultationController: T = {};

/** SPA */

consultationController.createConsultation = async (req: Request, res: Response) => {
    try {
        console.log('createConsultation');
        
        const input: ConsultationInput = req.body;
        

        // attach memberId if logged in
        const extReq = req as ExtendedRequest;
        console.log('cookie member:', extReq.member?._id);
        if (extReq.member?._id) input.memberId = extReq.member._id;

        const result = await consultationService.createConsultation(input);
        res.status(HttpCode.CREATED).json(result);
    } catch (err) {
        console.log('Error, createConsultation:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

consultationController.getMyConsultations = async (req: ExtendedRequest, res: Response) => {
    try {
        console.log('getMyConsultations');
        const result = await consultationService.getMyConsultations(req.member._id);
        res.status(HttpCode.OK).json(result);
    } catch (err) {
        console.log('Error, getMyConsultations:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

export default consultationController;