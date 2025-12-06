export class CalendarEntryResponseDTO {
    id!: string;
    date!: string;
    start_minute!: number;
    end_minute!: number;
    title!: string;
    color?: string;
}