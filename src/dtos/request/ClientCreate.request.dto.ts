export class ClientInfoCreateRequestDTO {
    address?: string;
    postal_code?: string;
    city?: string;
    state?: string;
    country?: string;
}

export class ClientCreateRequestDTO {
    name!: string;
    info?: ClientInfoCreateRequestDTO;
}
