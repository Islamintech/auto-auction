import { NextFunction, Request, Response } from 'express';
import { T } from '../libs/types/common';
import { ExtendedRequest, LoginInput, Member, MemberInput, MemberUpdateInput } from '../libs/types/member';
import MemberService from '../models/Member.service';
import Errors, { HttpCode, Message } from '../libs/Errors';
import AuthService from '../models/Auth.service';
import { AUTH_TIMER } from '../libs/config';

const memberService = new MemberService();
const authService = new AuthService();

const isProd = process.env.NODE_ENV === 'production';

/**
 * Options for the accessToken cookie.
 *
 * httpOnly was false, which let any script on the page read the session token —
 * a single XSS meant a 24h account takeover. Nothing client-side reads it, so
 * it is now hidden from JavaScript. secure/sameSite mirror the express-session
 * cookie in app.ts: the SPA and the API sit on different subdomains, so the
 * cookie has to survive a cross-origin request with credentials.
 *
 * Clearing a cookie only works when the attributes match the ones it was set
 * with, so logout reuses this too.
 */
const AUTH_COOKIE = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ('none' as const) : ('lax' as const),
    path: '/',
};

const memberController: T = {};

memberController.signup = async (req: Request, res: Response) => {
    try {
        console.log('signup');
        const input: MemberInput = req.body;
        const result: Member = await memberService.signup(input);
        const token = await authService.createToken(result);

        res.cookie('accessToken', token, {
            ...AUTH_COOKIE,
            maxAge: AUTH_TIMER * 3600 * 1000,
        });

        res.status(HttpCode.CREATED).json({ member: result, accessToken: token });
    } catch (err) {
        console.log('Error, signup:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

memberController.login = async (req: Request, res: Response) => {
    try {
        console.log('login');
        const input: LoginInput = req.body;
        const result = await memberService.login(input);
        const token = await authService.createToken(result);

        res.cookie('accessToken', token, {
            ...AUTH_COOKIE,
            maxAge: AUTH_TIMER * 3600 * 1000,
        });

        res.status(HttpCode.OK).json({ member: result, accessToken: token });
    } catch (err) {
        console.log('Error, login:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

memberController.logout = (req: ExtendedRequest, res: Response) => {
    try {
        console.log('logout');
        res.clearCookie('accessToken', AUTH_COOKIE);
        res.status(HttpCode.OK).json({ logout: true });
    } catch (err) {
        console.log('Error, logout:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

memberController.getMemberDetail = async (req: ExtendedRequest, res: Response) => {
    try {
        console.log('getMemberDetail');
        const result = await memberService.getMemberDetail(req.member);
        res.status(HttpCode.OK).json(result);
    } catch (err) {
        console.log('Error, getMemberDetail:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

memberController.updateMember = async (req: ExtendedRequest, res: Response) => {
    try {
        console.log('updateMember');
        const input: MemberUpdateInput = req.body;
        if (req.file) input.memberImage = req.file.path.replace(/\\/g, '/');
        const result = await memberService.updateMember(req.member, input);
        res.status(HttpCode.OK).json(result);
    } catch (err) {
        console.log('Error, updateMember:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

memberController.getTopUsers = async (req: Request, res: Response) => {
    try {
        console.log('getTopUsers');
        const result = await memberService.getTopUsers();
        res.status(HttpCode.OK).json(result);
    } catch (err) {
        console.log('Error, getTopUsers:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

memberController.verifyAuth = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies['accessToken'];
        // The token only proves which id is calling; the member itself is read
        // from the database on each request, so a ban or deletion takes effect
        // at once instead of lingering until the token expires.
        if (token) {
            const payload = await authService.checkAuth(token);
            const member = await memberService.getAuthenticatedMember(payload?._id);
            if (member) req.member = member;
        }
        if (!req.member)
            throw new Errors(HttpCode.UNAUTHIRIZED, Message.NOT_AUTHENTICATED);
        next();
    } catch (err) {
        console.log('Error, verifyAuth:', err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(Errors.standart.code).json({ message: Errors.standart.message });
    }
};

memberController.retrieveAuth = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies['accessToken'];
        if (token) {
            const payload = await authService.checkAuth(token);
            const member = await memberService.getAuthenticatedMember(payload?._id);
            if (member) req.member = member;
        }
        next();
    } catch (err) {
        console.log('Error, retrieveAuth:', err);
        next();
    }
};

export default memberController;