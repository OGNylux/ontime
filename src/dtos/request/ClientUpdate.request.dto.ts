export class ClientInfoUpdateRequestDTO {
    address?: string;
    postal_code?: string;
    city?: string;
    state?: string;
    country?: string;
}

export class ClientUpdateRequestDTO {
    id!: string;
    name?: string;
    info?: ClientInfoUpdateRequestDTO;
}
