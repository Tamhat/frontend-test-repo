import { IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator';

export class CreateChatSessionDto {
    @IsOptional()
    @IsString()
    title?: string;
}

export class SendMessageDto {
    @IsNotEmpty()
    @IsString()
    message: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    documentIds?: string[];

    @IsOptional()
    @IsString()
    model?: string;
}
