import { NextFunction, Request, Response } from 'express';
import { T } from '../libs/types/common';
import MemberService from '../models/Member.service';
import PostService from '../models/Post.service';
import { AdminRequest, LoginInput, MemberInput } from '../libs/types/member';
import { MemberType } from '../libs/enums/member.enum';
import Errors, { HttpCode, Message } from '../libs/Errors';
import MemberModel from '../schema/Member.model';
import CarModel from '../schema/Car.model';
import ConsultationModel from '../schema/Consultation.model';
import { ConsultationStatus } from '../libs/enums/consultation.enum';
import PostModel from '../schema/Post.model';
import ConsultationService from '../models/consultation.service';

const memberService = new MemberService();
const postService = new PostService();
const consultationService = new ConsultationService();
const adminController: T = {};

adminController.goHome = async (req: Request, res: Response) => {
    try {
        console.log('goHome');
        const stats = {
            cars:          await CarModel.countDocuments({ carStatus: { $ne: 'DELETE' } }),
            members:       await MemberModel.countDocuments({ memberType: MemberType.USER }),
            consultations: await ConsultationModel.countDocuments({}),
            pending:       await ConsultationModel.countDocuments({ status: 'PENDING' }),
            posts:         await PostModel.countDocuments({ postStatus: 'ACTIVE' }),
        };
        res.render('home', { stats });
    } catch (err) {
        console.log('Error, goHome:', err);
        res.render('home', { stats: null });
    }
};;

adminController.goSignup = (req: Request, res: Response) => {
    try {
        console.log('goSignup');
        res.render('signup');
    } catch (err) {
        console.log('Error, goSignup:', err);
        res.redirect('/admin');
    }
};

adminController.goLogin = (req: Request, res: Response) => {
    try {
        console.log('goLogin');
        res.render('login');
    } catch (err) {
        console.log('Error, goLogin:', err);
        res.redirect('/admin');
    }
};

adminController.processSignup = async (req: AdminRequest, res: Response) => {
    try {
        console.log('processSignup');
        const newMember: MemberInput = req.body;
        newMember.memberType = MemberType.ADMIN;
        const result = await memberService.processSignup(newMember);
        req.session.member = result;
        req.session.save(function () {
            res.redirect('/admin/car/all');
        });
    } catch (err) {
        console.log('Error, processSignup:', err);
        const message = err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
        res.send(
            `<script>alert(${JSON.stringify(message)}); window.location.replace('/admin/signup')</script>`
        );
    }
};

adminController.processLogin = async (req: AdminRequest, res: Response) => {
    try {
        console.log('processLogin');
        const input: LoginInput = req.body;
        const result = await memberService.processLogin(input);
        req.session.member = result;
        req.session.save(function () {
            res.redirect('/admin/car/all');
        });
    } catch (err) {
        console.log('Error, processLogin:', err);
        const message = err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
        res.send(
            `<script>alert("${message}"); window.location.replace('/admin/login')</script>`
        );
    }
};

adminController.logout = async (req: AdminRequest, res: Response) => {
    try {
        console.log('logout');
        req.session.destroy(function () {
            res.redirect('/admin');
        });
    } catch (err) {
        console.log('Error, logout:', err);
        res.redirect('/admin/login');
    }
};

adminController.checkAuthSession = async (req: AdminRequest, res: Response) => {
    try {
        console.log('checkAuthSession');
        if (req.session?.member)
            res.send(`<script>alert("${req.session.member.memberNick}")</script>`);
        else
            res.send(`<script>alert("${Message.NOT_AUTHENTICATED}")</script>`);
    } catch (err) {
        console.log('Error, checkAuthSession:', err);
        res.send(err);
    }
};

adminController.verifyAdmin = (req: AdminRequest, res: Response, next: NextFunction) => {
    if (req.session?.member?.memberType === MemberType.ADMIN) {
        req.member = req.session.member;
        next();
    } else {
        const message = Message.NOT_AUTHENTICATED;
        res.send(
            `<script>alert("${message}"); window.location.replace('/admin/login')</script>`
        );
    }
};

/** Members */
adminController.getMembers = async (req: Request, res: Response) => {
    try {
        console.log('getMembers');
        const result = await memberService.getMembers();
        res.render('members', { members: result });
    } catch (err) {
        console.log('Error, getMembers:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

adminController.updateChosenMember = async (req: Request, res: Response) => {
    try {
        console.log('updateChosenMember');
        const result = await memberService.updateChosenUser(req.body);
        res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
        console.log('Error, updateChosenMember:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

/** Consultations */
adminController.getConsultations = async (req: Request, res: Response) => {
      try {
          console.log('getConsultations');
          const inquiry = {
              page: Number(req.query.page) || 1,
              limit: Number(req.query.limit) || 25,
              status: req.query.status as ConsultationStatus | undefined,
          };
          const result = await consultationService.getConsultations(inquiry);
          res.render('consultations', { consultations: result });
      } catch (err) {
          console.log('Error, getConsultations:', err);
          res.render('consultations', { consultations: [] });
      }
  };

  adminController.updateChosenConsultation = async (req: Request, res: Response) => {
      try {
          console.log('updateChosenConsultation');
          const { id } = req.params;
          const result = await consultationService.updateChosenConsultation(
              String(id),
              req.body
          );
          res.status(HttpCode.OK).json({ data: result });
      } catch (err) {
          console.log('Error, updateChosenConsultation:', err);
          if (err instanceof Errors) res.status(err.code).json({ message: err.message });
          else res.status(Errors.standart.code).json({ message: Errors.standart.message });
      }
  };

  adminController.deleteChosenConsultation = async (req: Request, res: Response) => {
      try {
          console.log('deleteChosenConsultation');
          const { id } = req.params;
          const result = await consultationService.deleteChosenConsultation(String(id));
          res.status(HttpCode.OK).json({ data: result });
      } catch (err) {
          console.log('Error, deleteChosenConsultation:', err);
          if (err instanceof Errors) res.status(err.code).json({ message: err.message });
          else res.status(Errors.standart.code).json({ message: Errors.standart.message });
      }
  };

/** Posts */
adminController.createPost = async (req: AdminRequest, res: Response) => {
    try {
        console.log('createPost');
        const input: any = {
            postTitle: req.body.postTitle,
            postBody:  req.body.postBody,
            postType:  req.body.postType,
        };

        if (req.file) {
            input.postImage = req.file.path.replace(/\\/g, '/');
        }

        await postService.createPost(req.member._id, input);
        // New posts start as DRAFT — say so, rather than claiming it is live.
        res.send(
            `<script>alert("Post saved as a draft. Use Publish to make it public."); window.location.replace('/admin/post/all')</script>`
        );
    } catch (err) {
        console.log('Error, createPost:', err);
        const message = err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
        res.send(
            `<script>alert("${message}"); window.location.replace('/admin/post/all')</script>`
        );
    }
};

adminController.getPosts = async (req: Request, res: Response) => {
    try {
        console.log('getPosts');
        const result = await postService.getAllPosts(); 
        res.render('posts', { posts: result });
    } catch (err) {
        console.log('Error, getPosts:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

adminController.updateChosenPost = async (req: AdminRequest, res: Response) => {
    try {
        console.log('updateChosenPost');
        const { id } = req.params;

        const input: any = {};
        if (req.body.postTitle  !== undefined) input.postTitle  = req.body.postTitle;
        if (req.body.postBody   !== undefined) input.postBody   = req.body.postBody;
        if (req.body.postType   !== undefined) input.postType   = req.body.postType;
        if (req.body.postStatus !== undefined) input.postStatus = req.body.postStatus;
        if (req.file) input.postImage = req.file.path.replace(/\\/g, '/');

        const result = await postService.updateChosenPost(String(id), input);
        res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
        console.log('Error, updateChosenPost:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

adminController.deleteChosenPost = async (req: Request, res: Response) => {
    try {
        console.log('deleteChosenPost');
        const { id } = req.params;
        const result = await postService.deleteChosenPost(String(id));
        res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
        console.log('Error, deleteChosenPost:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

export default adminController;