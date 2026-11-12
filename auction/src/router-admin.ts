import express from 'express';
const routerAdmin = express.Router();
import adminController from "./controllers/admin.controller";
import carController from './controllers/car.controller';
import makeUploader, { handleUpload } from "./libs/utils/uploader";

/** Auth */
routerAdmin.get('/', adminController.goHome);

routerAdmin
    .get('/login', adminController.goLogin)
    .post('/login', adminController.processLogin);

routerAdmin
    .get('/signup', adminController.goSignup)
    .post(
        '/signup',
        handleUpload(makeUploader('members').single('memberImage')),
        adminController.processSignup
    );

routerAdmin.get('/logout', adminController.logout);
routerAdmin.get('/check-me', adminController.checkAuthSession);

/** Cars */
routerAdmin.get(
    '/car/all',
    adminController.verifyAdmin,
    carController.getAllCars
);

routerAdmin.get(
    '/currency/usd-krw',
    adminController.verifyAdmin,
    carController.getUsdKrwRate
);

routerAdmin.post(
    '/car/create',
    adminController.verifyAdmin,
    handleUpload(makeUploader('cars').array('carImages', 10)),
    carController.createNewCar
);

routerAdmin.post(
    '/car/:id',
    adminController.verifyAdmin,
    carController.updateChosenCar
);

routerAdmin.post(
    '/car/:id/delete',
    adminController.verifyAdmin,
    carController.deleteChosenCar
);

/** Members */
routerAdmin.get(
    '/member/all',
    adminController.verifyAdmin,
    adminController.getMembers
);

routerAdmin.post(
    '/member/edit',
    adminController.verifyAdmin,
    adminController.updateChosenMember
);

/** Consultations */
routerAdmin.get(
    '/consultation/all',
    adminController.verifyAdmin,
    adminController.getConsultations
);

routerAdmin.post(
    '/consultation/:id',
    adminController.verifyAdmin,
    adminController.updateChosenConsultation
);

routerAdmin.post(
    '/consultation/:id/delete',
    adminController.verifyAdmin,
    adminController.deleteChosenConsultation
);

/** Posts */
routerAdmin.get(
    '/post/all',
    adminController.verifyAdmin,
    adminController.getPosts
);

routerAdmin.post(
    '/post/create',
    adminController.verifyAdmin,
    handleUpload(makeUploader('posts').single('postImage')),
    adminController.createPost
);

routerAdmin.post(
    '/post/:id',
    adminController.verifyAdmin,
    handleUpload(makeUploader('posts').single('postImage')),
    adminController.updateChosenPost
);

routerAdmin.post(
    '/post/:id/delete',
    adminController.verifyAdmin,
    adminController.deleteChosenPost
);

export default routerAdmin;
