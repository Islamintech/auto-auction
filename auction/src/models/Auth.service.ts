import { AUTH_TIMER } from "../libs/config";
import { Member } from "../libs/types/member";
import jwt from "jsonwebtoken";
import Errors, { HttpCode, Message } from "../libs/Errors";

/** What actually travels in the token. */
export interface AuthPayload {
    _id: string;
}

class AuthService {
    private readonly secretToken;

    constructor() {
        this.secretToken = process.env.SECRET_TOKEN as string;
    }

    /**
     * Signs an identifier, nothing more.
     *
     * This used to sign the whole member document, which put memberPhone,
     * memberEmail and memberAddress inside a token that is only base64 —
     * anyone holding it could read them. The id is all the server needs;
     * everything else is loaded fresh per request (see checkAuth callers).
     */
    public async createToken(member: Member): Promise<string> {
        const payload: AuthPayload = { _id: String(member._id) };

        return new Promise((resolve, reject) => {
            const duration = `${AUTH_TIMER}h`;
            jwt.sign(
                payload,
                this.secretToken,
                { expiresIn: duration },
                (err, token) => {
                    if (err)
                        reject(
                            new Errors(
                                HttpCode.UNAUTHIRIZED,
                                Message.TOKEN_CREATION_FAILED
                            )
                        );
                    else resolve(token as string);
                }
            );
        });
    }

    public async checkAuth(token: string): Promise<AuthPayload> {
        return jwt.verify(token, this.secretToken) as AuthPayload;
    }
}

export default AuthService;
