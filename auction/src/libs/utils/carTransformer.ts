import { CarCondition } from '../enums/car.enum';

export const toClientCar = (car: any) => {
    if (!car) return car;
    
    // Converts Mongoose Document to plain JS object, then re-merges custom-attached fields
    // (toObject() strips non-schema properties like myFavorite / comments)
    const base = typeof car.toObject === 'function' ? car.toObject() : car;
    const c = {
        ...base,
        myFavorite: (car as any).myFavorite ?? base.myFavorite,
        comments:   (car as any).comments   ?? base.comments,
    };
    const images: string[] = Array.isArray(c.carImages) ? c.carImages : [];
    
    return {
        id: String(c._id),
        title: c.carTitle,
        vin: c.carVin,
        buyerName: c.buyerName,
        salePrice: c.salePrice,
        saleDate: c.saleDate,
        brand: c.carBrand,
        make: c.carMake,
        model: c.carModel,
        type: c.carType,
        condition: c.carCondition,
        category: c.carCondition === CarCondition.DAMAGED ? 'crashed' : 'ready',
        fuel: c.carFuel,
        trans: c.carTransmission,
        year: c.carYear,
        km: c.carMileage,
        price: c.carPrice,
        priceCurrency: 'KRW',
        color: c.carColor,
        desc: c.carDesc,
        image: images[0] || null,
        images,
        status: c.carStatus,
        viewCount: c.carViewCount,
        likeCount: c.carLikeCount,
        commentCount: c.carCommentCount,
        consultationCount: c.carConsultationCount,
        
        // 👇 The missing piece for React's heart state
        myFavorite: c.myFavorite ?? false,
        comments: c.comments ?? [],

        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    };
};

export const toClientCars = (cars: any[]) => (cars || []).map(toClientCar);
