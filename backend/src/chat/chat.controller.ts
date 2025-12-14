import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatSessionDto, SendMessageDto } from './dto/chat.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post('sessions')
    async createSession(@Body() dto: CreateChatSessionDto, @Req() req: any) {
        return this.chatService.createSession(req.user.id, dto.title);
    }

    @Get('sessions')
    async getUserSessions(@Req() req: any) {
        return this.chatService.getUserSessions(req.user.id);
    }

    @Get('sessions/:id')
    async getSession(@Param('id') id: string, @Req() req: any) {
        return this.chatService.getSession(id, req.user.id);
    }

    @Post('sessions/:id/messages')
    async sendMessage(
        @Param('id') id: string,
        @Body() dto: SendMessageDto,
        @Req() req: any,
    ) {
        return this.chatService.sendMessage(
            id,
            req.user.id,
            dto.message,
            dto.documentIds,
            dto.model,
        );
    }

    @Delete('sessions/:id')
    async deleteSession(@Param('id') id: string, @Req() req: any) {
        return this.chatService.deleteSession(id, req.user.id);
    }

    @Patch('sessions/:id')
    async renameSession(
        @Param('id') id: string,
        @Body() dto: { title: string },
        @Req() req: any,
    ) {
        return this.chatService.renameSession(id, req.user.id, dto.title);
    }
}
