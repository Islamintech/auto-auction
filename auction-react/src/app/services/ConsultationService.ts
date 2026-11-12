import api from "../../lib/api";
import { Consultation, ConsultationInput } from "../../lib/types/consultation";

class ConsultationService {
  public async create(input: ConsultationInput): Promise<Consultation> {
    try {
      const result = await api.post("/consultation/create", input);
      return result.data;
    } catch (err) {
      console.error("Error, ConsultationService.create:", err);
      throw err;
    }
  }

  public async getMy(): Promise<Consultation[]> {
    try {
      const result = await api.get("/consultation/my");
      return result.data;
    } catch (err) {
      console.error("Error, ConsultationService.getMy:", err);
      throw err;
    }
  }
}

export default ConsultationService;
