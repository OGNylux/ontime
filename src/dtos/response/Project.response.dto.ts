import { ClientResponseDTO } from "./Client.response.dto";

export class ProjectResponseDTO {
    id!: string;
    name!: string;
    color?: string | null;
    client_id?: string;
    client?: ClientResponseDTO;
}
