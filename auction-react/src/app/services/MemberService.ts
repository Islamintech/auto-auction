import api from "../../lib/api";
import { LoginInput, Member, MemberInput, MemberUpdateInput } from "../../lib/types/member";

function extractMember(data: any): Member | null {
  const member = data?.member || data?.data?.member || data?.data || data;
  return member?._id ? member : null;
}

function applyClearedFields(member: Member, input: MemberUpdateInput): Member {
  return {
    ...member,
    memberNick: input.memberNick ?? member.memberNick,
    memberPhone: input.memberPhone ?? member.memberPhone,
    memberEmail: input.memberEmail ?? member.memberEmail,
    memberAddress: input.memberAddress ?? member.memberAddress,
    memberCountry: input.memberCountry ?? member.memberCountry,
    memberTelegram: input.memberTelegram ?? member.memberTelegram,
    memberDesc: input.memberDesc ?? member.memberDesc,
  };
}

class MemberService {

  public async signup(input: MemberInput): Promise<Member> {
    try {
      const result = await api.post("/member/signup", input);
      const member: Member = result.data.member;
      localStorage.setItem("memberData", JSON.stringify(member));
      return member;
    } catch (err) {
      console.error("Error signup:", err);
      throw err;
    }
  }

  public async login(input: LoginInput): Promise<Member> {
    try {
      const result = await api.post("/member/login", input);
      const member: Member = result.data.member;
      localStorage.setItem("memberData", JSON.stringify(member));
      return member;
    } catch (err) {
      console.error("Error login:", err);
      throw err;
    }
  }

  public async logout(): Promise<void> {
    try {
      const result = await api.post("/member/logout", {});
      localStorage.removeItem("memberData");
      return result.data.logout;
    } catch (err) {
      console.error("Error logout:", err);
      throw err;
    }
  }

  public async getDetail(): Promise<Member> {
    try {
      const result = await api.get("/member/detail");
      return result.data;
    } catch (err) {
      console.error("Error, getDetail:", err);
      throw err;
    }
  }

  public async updateMember(input: MemberUpdateInput): Promise<Member> {
    try {
      const formData = new FormData();
      formData.append("_id", input._id);
      formData.append("memberNick", input.memberNick || "");
      formData.append("memberPhone", input.memberPhone || "");
      formData.append("memberEmail", input.memberEmail || "");
      formData.append("memberAddress", input.memberAddress || "");
      formData.append("memberCountry", input.memberCountry || "");
      formData.append("memberTelegram", input.memberTelegram || "");
      formData.append("memberDesc", input.memberDesc || "");
      if (input.memberImage instanceof File) {
        formData.append("memberImage", input.memberImage);
      }

      const result = await api.post("/member/update", formData);

      const member = applyClearedFields(extractMember(result.data) || await this.getDetail(), input);
      localStorage.setItem("memberData", JSON.stringify(member));
      return member;
    } catch (err) {
      console.error("Error updateMember:", err);
      throw err;
    }
  }
}

export default MemberService;
