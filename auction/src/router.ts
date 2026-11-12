import express from 'express';
const router = express.Router();
import memberController from './controllers/member.controller';
import carController from './controllers/car.controller';
import postController from './controllers/post.controller';
import pointsController from './controllers/points.controller'
import consultationController from './controllers/consultation.controller';
import uploader from './libs/utils/uploader';

/** Members */
router.post('/member/signup', memberController.signup);
router.post('/member/login', memberController.login);
router.post('/member/logout', memberController.logout);
router.get(
    '/member/detail',
    memberController.verifyAuth,
    memberController.getMemberDetail
);
router.post(
    '/member/update',
    memberController.verifyAuth,
    uploader('members').single('memberImage'),
    memberController.updateMember
);
// The public /member/top-users route was removed along with the homepage
// leaderboard: it was unauthenticated and returned whole member documents,
// including memberPhone and memberEmail.

/** Public VIN lookup (SSR page) */
router.get('/vin', carController.vinLookup);

/** Cars */
router.get('/currency/usd-krw', carController.getUsdKrwRate);
router.get('/car/all', carController.getCars);
router.get('/car/verify/:vin', carController.verifyCarByVin);
router.get(
    '/car/:id',
    memberController.retrieveAuth,
    carController.getCar
);
router.post(
    '/car/:id/like',
    memberController.verifyAuth,
    carController.likeCar
);
router.post(
    '/car/:id/comment',
    memberController.verifyAuth,
    carController.commentCar
);

/** Posts */
router.get('/post/all', postController.getPosts);
router.get(
    '/post/:id',
    memberController.retrieveAuth,
    postController.getPost
);
router.post(
    '/post/create',
    memberController.verifyAuth,
    postController.createPost
);
router.post(
    '/post/:id/like',
    memberController.verifyAuth,
    postController.likePost
);
router.post(
    '/post/:id/comment',
    memberController.verifyAuth,
    postController.commentPost
);


/** Consultations */
router.post(
    '/consultation/create',
    memberController.retrieveAuth,
    consultationController.createConsultation  // no verifyAuth — guests can inquire
);
router.get(
    '/consultation/my',
    memberController.verifyAuth,
    consultationController.getMyConsultations
);

/** Points */
router.get(
    '/points/history',
    memberController.verifyAuth,
    pointsController.getPointsHistory
);
// /points/leaderboard removed too — it served the same top-member list under a
// second path, and no client consumed it.

export default router;