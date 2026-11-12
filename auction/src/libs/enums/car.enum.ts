export enum CarStatus {
    ONSALE = 'ONSALE',
    RESERVED = 'RESERVED',
    SOLD = 'SOLD',
    DELETE = 'DELETE',
}

// Brands are free text: the admin types whatever the car actually is, so no enum
// can stay complete. These values are only the datalist suggestions in the form.
export const CAR_BRAND_SUGGESTIONS = [
    'HYUNDAI',
    'KIA',
    'GENESIS',
    'SAMSUNG',
    'CHEVROLET',
    'SSANGYONG',
    'BMW',
    'MERCEDES',
    'AUDI',
    'TOYOTA',
    'HONDA',
    'TESLA',
];

export enum CarType {
    SEDAN = 'SEDAN',
    SUV = 'SUV',
    VAN = 'VAN',
    HATCHBACK = 'HATCHBACK',
    COUPE = 'COUPE',
    CONVERTIBLE = 'CONVERTIBLE',
    TRUCK = 'TRUCK',
    WAGON = 'WAGON',
    OTHER = 'OTHER',
}

export enum CarCondition {
    INTACT = 'INTACT',
    DAMAGED = 'DAMAGED',
}

export enum CarFuel {
    PETROL = 'PETROL',
    DIESEL = 'DIESEL',
    HYBRID = 'HYBRID',
    ELECTRIC = 'ELECTRIC',
    LPG = 'LPG',
    OTHER = 'OTHER',
}

export enum CarTransmission {
    AUTO = 'AUTO',
    MANUAL = 'MANUAL',
    CVT = 'CVT',
    DCT = 'DCT',
}

// Colors are free text too — same rationale as CAR_BRAND_SUGGESTIONS.
export const CAR_COLOR_SUGGESTIONS = [
    'WHITE',
    'BLACK',
    'SILVER',
    'GRAY',
    'RED',
    'BLUE',
];
