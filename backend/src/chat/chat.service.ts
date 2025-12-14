import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ChatService {
    private readonly openRouterApiKey: string;
    private readonly openRouterBaseUrl = 'https://openrouter.ai/api/v1';

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
    ) {
        this.openRouterApiKey = this.config.get<string>('OPENROUTER_API_KEY') || '';
    }

    async createSession(userId: string, title?: string) {
        return this.prisma.chatSession.create({
            data: {
                userId,
                title: title || 'New Chat',
            },
        });
    }

    async getUserSessions(userId: string) {
        return this.prisma.chatSession.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            include: {
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }

    async getSession(sessionId: string, userId: string) {
        const session = await this.prisma.chatSession.findFirst({
            where: { id: sessionId, userId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!session) {
            throw new NotFoundException('Chat session not found');
        }

        return session;
    }

    async sendMessage(
        sessionId: string,
        userId: string,
        message: string,
        documentIds?: string[],
        model?: string,
    ) {
        // Verify session ownership
        const session = await this.prisma.chatSession.findFirst({
            where: { id: sessionId, userId },
        });

        if (!session) {
            throw new NotFoundException('Chat session not found');
        }

        // Save user message
        await this.prisma.chatMessage.create({
            data: {
                sessionId,
                role: 'user',
                content: message,
            },
        });

        // Get document context if documentIds provided
        let documentContext = '';
        if (documentIds && documentIds.length > 0) {
            const documents = await this.prisma.document.findMany({
                where: { id: { in: documentIds } },
                include: { fund: true },
            });

            if (documents.length > 0) {
                documentContext = '\n\nREFERENCED DOCUMENTS:\n';
                documents.forEach((doc) => {
                    documentContext += `- Title: ${doc.title}\n`;
                    documentContext += `  Fund: ${doc.fund.name} (${doc.fund.code})\n`;
                    documentContext += `  Type: ${doc.type}\n`;
                    documentContext += `  Status: ${doc.status}\n`;
                    documentContext += `  Period: ${new Date(doc.periodStart).toLocaleDateString()} - ${new Date(doc.periodEnd).toLocaleDateString()}\n`;
                    if (doc.description) {
                        documentContext += `  Description: ${doc.description}\n`;
                    }
                    documentContext += '\n';
                });
            }
        }

        // Get chat history
        const messages = await this.prisma.chatMessage.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
            take: 20, // Limit context to last 20 messages
        });

        // Prepare messages for OpenRouter
        const openRouterMessages = [
            {
                role: 'system',
                content: `You are a helpful AI assistant for Audit Vault, a compliance document management system. You help users understand and analyze their compliance documents, annual reports, and regulatory filings.${documentContext}`,
            },
            ...messages.map((msg) => ({
                role: msg.role,
                content: msg.content,
            })),
        ];

        try {
            // Call OpenRouter API
            const response = await axios.post(
                `${this.openRouterBaseUrl}/chat/completions`,
                {
                    model: model || 'meta-llama/llama-3.2-3b-instruct:free',
                    messages: openRouterMessages,
                    max_tokens: 1000,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.openRouterApiKey}`,
                        'HTTP-Referer': 'https://auditvault.com',
                        'X-Title': 'Audit Vault',
                        'Content-Type': 'application/json',
                    },
                },
            );

            const aiResponse = response.data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

            // Save AI response
            const aiMessage = await this.prisma.chatMessage.create({
                data: {
                    sessionId,
                    role: 'assistant',
                    content: aiResponse,
                },
            });

            // Update session timestamp
            await this.prisma.chatSession.update({
                where: { id: sessionId },
                data: { updatedAt: new Date() },
            });

            return aiMessage;
        } catch (error) {
            console.error('OpenRouter API Error:', error.response?.data || error.message);
            throw new BadRequestException(
                error.response?.data?.error?.message || 'Failed to generate AI response. Please check your OpenRouter API key.',
            );
        }
    }

    async deleteSession(sessionId: string, userId: string) {
        const session = await this.prisma.chatSession.findFirst({
            where: { id: sessionId, userId },
        });

        if (!session) {
            throw new NotFoundException('Chat session not found');
        }

        await this.prisma.chatSession.delete({
            where: { id: sessionId },
        });

        return { message: 'Chat session deleted successfully' };
    }

    async renameSession(sessionId: string, userId: string, title: string) {
        const session = await this.prisma.chatSession.findFirst({
            where: { id: sessionId, userId },
        });

        if (!session) {
            throw new NotFoundException('Chat session not found');
        }

        // Auto-generate title from first message if title is "New Chat"
        if (title === 'New Chat' && session.title === 'New Chat') {
            const firstMessage = await this.prisma.chatMessage.findFirst({
                where: { sessionId, role: 'user' },
                orderBy: { createdAt: 'asc' },
            });

            if (firstMessage) {
                // Use first 50 characters of first message as title
                title = firstMessage.content.slice(0, 50) + (firstMessage.content.length > 50 ? '...' : '');
            }
        }

        return this.prisma.chatSession.update({
            where: { id: sessionId },
            data: { title },
        });
    }
}
