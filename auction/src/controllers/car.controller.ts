import { Request, Response } from 'express';
import Errors, { HttpCode, Message } from '../libs/Errors';
import { T } from '../libs/types/common';
import CarService from '../models/car.service';
import { AdminRequest, ExtendedRequest } from '../libs/types/member';
import { CarInput, CarInquiry, CarUpdateInput } from '../libs/types/car';
import { CarBrand, CarColor, CarCondition, CarFuel, CarStatus, CarTransmission, CarType } from '../libs/enums/car.enum';
import { toClientCar, toClientCars } from '../libs/utils/carTransformer';
import CurrencyService from '../models/currency.service';

const carService = new CarService();
const currencyService = new CurrencyService();
const carController: T = {};

/** SPA **/
carController.getCars = async (req: Request, res: Response) => {
    try {
        console.log('getCars');
        const { page, limit, order, carBrand, search } = req.query;

        const inquiry: CarInquiry = {
            order: order ? String(order) : 'createdAt',
            page: Number(page) || 1,
            limit: Number(limit) || 12,
        };

        if (carBrand) inquiry.carBrand = carBrand as CarBrand;
        if (search) inquiry.search = String(search);

        const result = await carService.getCars(inquiry);
        res.status(HttpCode.OK).json(toClientCars(result));
    } catch (err) {
        console.log('Error, getCars:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

carController.getCar = async (req: ExtendedRequest, res: Response) => {
    try {
        console.log('getCar');
        const { id } = req.params;
        const memberId = req.member?._id ?? null;
        const result = await carService.getCar(memberId, String(id));
        res.status(HttpCode.OK).json(toClientCar(result));
    } catch (err) {
        console.log('Error, getCar:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

carController.likeCar = async (req: ExtendedRequest, res: Response) => {
    try {
        console.log('likeCar');
        const { id } = req.params;
        const result = await carService.likeCar(req.member._id, String(id));
        res.status(HttpCode.OK).json(toClientCar(result));
    } catch (err) {
        console.log('Error, likeCar:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

carController.commentCar = async (req: ExtendedRequest, res: Response) => {
    try {
        console.log('commentCar');
        const { id } = req.params;
        const result = await carService.commentCar(req.member._id, String(id), req.body);
        res.status(HttpCode.OK).json(toClientCar(result));
    } catch (err) {
        console.log('Error, commentCar:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

carController.verifyCarByVin = async (req: Request, res: Response) => {
    try {
        const { vin } = req.params;
        const car: any = await carService.getCarByVin(String(vin));

        if (!car) {
            return res.status(HttpCode.OK).json({ found: false, sold: false });
        }

        const sold = car.carStatus === CarStatus.SOLD;
        const clientCar = toClientCar(car);

        res.status(HttpCode.OK).json({
            ...clientCar,
            found: true,
            sold,
            buyerName: sold ? car.buyerName : null,
            salePrice: sold ? car.salePrice : null,
            saleDate: sold ? car.saleDate : null,
            soldAt: sold ? car.saleDate : null,
        });
    } catch (err) {
        console.log('Error, verifyCarByVin:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

carController.vinLookup = async (req: Request, res: Response) => {
    try {
        const vin = req.query.vin ? String(req.query.vin).trim() : '';
        let car = null;
        let searched = false;

        if (vin) {
            searched = true;
            car = await carService.getCarByVin(vin);
        }

        res.render('vin-lookup', { vin, car, searched });
    } catch (err) {
        console.log('Error, vinLookup:', err);
        res.render('vin-lookup', { vin: '', car: null, searched: false });
    }
};

/** SSR **/
carController.getAllCars = async (req: Request, res: Response) => {
    try {
        const data = await carService.getAllCars();
        res.render('cars', {
            cars: data,
            CarBrand: Object.values(CarBrand),
            CarColor: Object.values(CarColor),
            CarStatus: Object.values(CarStatus),
            CarType: Object.values(CarType),
            CarCondition: Object.values(CarCondition),
            CarFuel: Object.values(CarFuel),
            CarTransmission: Object.values(CarTransmission),
        });
    } catch (err) {
        console.log('Error, getAllCars:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

carController.getUsdKrwRate = async (req: Request, res: Response) => {
    try {
        const result = await currencyService.getUsdKrwRate();
        res.status(HttpCode.OK).json({
            base: 'USD',
            quote: 'KRW',
            rate: result.rate,
            date: result.date,
            fetchedAt: result.fetchedAt,
        });
    } catch (err) {
        console.log('Error, getUsdKrwRate:', err);
        res.status(HttpCode.SERVICE_UNAVAILABLE).json({
            message: 'Exchange rate is temporarily unavailable',
        });
    }
};

carController.createNewCar = async (req: AdminRequest, res: Response) => {
    try {
        console.log('createNewCar');
        if (!req.files?.length)
            throw new Errors(HttpCode.INTERNAL_SERVER_ERROR, Message.CREATED_FAILED);

        const data: CarInput = req.body;
        data.carImages = req.files?.map((ele) => {
            return ele.path.replace(/\\/g, '/');
        });

        await carService.createNewCar(data);

        res.send(
            `<script>alert("Car created successfully"); window.location.replace('/admin/car/all')</script>`
        );
    } catch (err) {
        console.log('Error, createNewCar:', err);
        const message = err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
        res.send(
            `<script>alert("${message}"); window.location.replace('/admin/car/all')</script>`
        );
    }
};

carController.updateChosenCar = async (req: Request, res: Response) => {
    try {
        console.log('updateChosenCar');
        const { id } = req.params;
        const input: CarUpdateInput = req.body;
        const result = await carService.updateChosenCar(String(id), input);
        res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
        console.log('Error, updateChosenCar:', err);
        // Always answer with a `{ message }` shape so the admin panel can show the
        // actual reason instead of a generic "failed" alert.
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

carController.deleteChosenCar = async (req: Request, res: Response) => {
    try {
        console.log('deleteChosenCar');
        const { id } = req.params;
        const result = await carService.deleteChosenCar(String(id));
        res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
        console.log('Error, deleteChosenCar:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

export default carController;
