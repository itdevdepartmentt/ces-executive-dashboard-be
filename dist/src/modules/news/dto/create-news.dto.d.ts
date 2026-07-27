export declare class CreateNewsDto {
    title: string;
    content: any;
    authorName: string;
    summary: string;
    category: string;
    status?: string;
    authorId?: string;
}
declare const UpdateNewsDto_base: import("@nestjs/common").Type<Partial<CreateNewsDto>>;
export declare class UpdateNewsDto extends UpdateNewsDto_base {
}
export {};
