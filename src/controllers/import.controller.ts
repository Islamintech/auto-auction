import { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';
import CarService from '../models/car.service';
import Errors from '../libs/Errors';
import { CarInput } from '../libs/types/car';
import {
    CarCondition,
    CarFuel,
    CarStatus,
    CarTransmission,
    CarType,
} from '../libs/enums/car.enum';
import { T } from '../libs/types/common';

/**
 * Machine-to-machine endpoint for the ingestion microservice (car-microservice).
 *
 * The microservice reviews nothing itself: an admin approves a listing there,
 * and only then does it call this to put the car in the catalogue. It sends
 * JSON with image URLs already hosted on Cloudinary, so there is no upload here.
 */
const carService = new CarService();
const importController: T = {};

const MIN_TOKEN_LENGTH = 16;
const expectedToken = (() => {
    const token = process.env.IMPORT_API_TOKEN?.trim();
    if (!token || token.length < MIN_TOKEN_LENGTH) {
        console.error(
            `IMPORT_API_TOKEN is unset or shorter than ${MIN_TOKEN_LENGTH} characters - /internal routes will reject every request.`
        );
        return null;
    }
    return Buffer.from(token, 'utf8');
})();

/** Bearer-token guard. Fails closed when the token is not configured. */
importController.verifyImportToken = (req: Request, res: Response, next: NextFunction) => {
    if (!expectedToken) return res.status(503).json({ message: 'Import API is not configured' });

    const [scheme, ...rest] = (req.headers.authorization ?? '').split(' ');
    const given = Buffer.from(rest.join(' ').trim(), 'utf8');
    const ok =
        scheme?.toLowerCase() === 'bearer' &&
        given.length === expectedToken.length &&
        timingSafeEqual(given, expectedToken);

    if (!ok) return res.status(401).json({ message: 'Invalid import token' });
    next();
};

const str = (v: unknown): string | undefined => {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    return s.length ? s : undefined;
};

const oneOf = <E extends Record<string, string>>(e: E, v: unknown): E[keyof E] | undefined =>
    (Object.values(e) as string[]).includes(String(v)) ? (v as E[keyof E]) : undefined;

/**
 * Turns the request body into a CarInput, or a list of what is wrong with it.
 * Explicit field-by-field copy: nothing outside this list (view counts, sale
 * records, _id) can be set through the import route.
 */
function parseImport(body: T): { input?: CarInput; problems: string[] } {
    const problems: string[] = [];
    const need = (name: string, v: unknown) => {
        if (v === undefined) problems.push(`${name} is required`);
        return v;
    };

    const importSource = need('importSource', str(body.importSource)) as string;
    const importId = need('importId', str(body.importId)) as string;
    const carTitle = need('carTitle', str(body.carTitle)) as string;
    const carBrand = need('carBrand', str(body.carBrand)) as string;
    const carYear = need('carYear', str(body.carYear)) as string;
    const carPrice = need('carPrice', str(body.carPrice)) as string;

    const carMileage = Number(body.carMileage);
    if (body.carMileage === undefined || body.carMileage === '' || !Number.isFinite(carMileage) || carMileage < 0)
        problems.push('carMileage must be a non-negative number');

    if (carPrice !== undefined && !/^\d+$/.test(carPrice))
        problems.push('carPrice must be whole KRW digits');

    const enumField = <E extends Record<string, string>>(name: string, e: E, fallback?: E[keyof E]) => {
        if (body[name] === undefined || body[name] === '') return fallback;
        const v = oneOf(e, body[name]);
        if (!v) problems.push(`${name} must be one of ${Object.values(e).join(', ')}`);
        return v;
    };
    const carType = enumField('carType', CarType, CarType.OTHER) as CarType;
    const carCondition = enumField('carCondition', CarCondition, CarCondition.INTACT) as CarCondition;
    const carFuel = enumField('carFuel', CarFuel) as CarFuel | undefined;
    const carTransmission = enumField('carTransmission', CarTransmission) as CarTransmission | undefined;

    const images: unknown[] = Array.isArray(body.carImages) ? body.carImages : [];
    const carImages = images.map(str).filter((u): u is string => !!u && /^https:\/\//.test(u));
    if (!carImages.length) problems.push('carImages needs at least one https URL');
    if (carImages.length !== images.length) problems.push('every carImages entry must be an https URL');

    if (problems.length) return { problems };

    return {
        problems,
        input: {
            importSource,
            importId,
            carStatus: CarStatus.ONSALE,
            carTitle,
            carBrand: carBrand.toUpperCase(),
            carModel: str(body.carModel),
            carVin: str(body.carVin)?.toUpperCase(),
            carType,
            carCondition,
            carFuel,
            carTransmission,
            carYear,
            carMileage,
            carPrice,
            carColor: str(body.carColor)?.toUpperCase(),
            carDesc: str(body.carDesc),
            carImages,
        },
    };
}

/**
 * POST /internal/car/import
 * 201 + { data, created: true }   new catalogue car
 * 200 + { data, created: false }  this listing was imported before
 * 400 + { message, problems? }    invalid input, or brand/year/title or VIN clash
 */
importController.importCar = async (req: Request, res: Response) => {
    try {
        const { input, problems } = parseImport(req.body ?? {});
        if (!input) return res.status(400).json({ message: 'Invalid import', problems });

        const { car, created } = await carService.importCar(input);
        res.status(created ? 201 : 200).json({ data: car, created });
    } catch (err) {
        console.log('Error, importCar:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

export default importController;
