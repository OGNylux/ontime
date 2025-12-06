export class ClientInfoResponseDTO {
    id!: string;
    address?: string;
    postal_code?: string;
    city?: string;
    state?: string;
    country?: string;
}

export class ClientResponseDTO {
    id!: string;
    name!: string;
    created_at!: string;
    info?: ClientInfoResponseDTO;
}
