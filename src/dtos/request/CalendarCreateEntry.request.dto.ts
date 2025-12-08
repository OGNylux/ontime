
export class CalendarCreateEntryRequestDTO {
    date!: string;
    start_minute!: number;
    end_minute!: number;
    task_id?: string;
    project_id?: string;
    is_billable?: boolean;
}