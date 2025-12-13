import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentStatusDto } from './dto/update-document-status.dto';
import { UserRole, DocStatus, AuditAction } from '@prisma/client';

@Injectable()
export class DocumentsService {
    constructor(
        private prisma: PrismaService,
        private storageService: StorageService,
        private auditService: AuditService,
    ) { }

    async create(createDocumentDto: CreateDocumentDto, file: Express.Multer.File, user: { id: string; role: UserRole }) {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
        const allowedExtensions = ['pdf', 'doc', 'docx'];
        if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
            throw new BadRequestException(`File extension .${fileExtension} is not allowed`);
        }

        const maxFileSize = 50 * 1024 * 1024;
        if (file.size > maxFileSize) {
            console.warn(`File size ${file.size} exceeds recommended limit, but proceeding`);
        }

        try {
            await this.prisma.$queryRaw`SELECT 1`;
        } catch (error) {
            console.warn('Database health check failed, but proceeding with upload');
        }


        let uploadAttempts = 0;
        const maxUploadAttempts = 3;
        let fileKey: string | undefined;

        while (uploadAttempts < maxUploadAttempts) {
            try {
                fileKey = await this.storageService.uploadFile(file);
                break;
            } catch (error) {
                uploadAttempts++;
                if (uploadAttempts >= maxUploadAttempts) {
                    throw new BadRequestException('Failed to upload file after multiple attempts');
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (!fileKey) {
            throw new BadRequestException('File upload failed');
        }

        const doc = await this.prisma.document.create({
            data: {
                title: createDocumentDto.title,
                fundId: createDocumentDto.fundId,
                type: createDocumentDto.type,
                periodStart: new Date(createDocumentDto.periodStart),
                periodEnd: new Date(createDocumentDto.periodEnd),
                fileKey,
                uploadedById: user.id,
                ...(createDocumentDto.description && { description: createDocumentDto.description }),
            },
        });

        await this.auditService.logAction(user.id, doc.id, AuditAction.CREATED, { fileKey });

        return doc;
    }

    async findAll(query: any, user?: { id: string; role: UserRole; accessibleFunds?: { id: string }[] }) {
        const where: any = {};

        if (query.fundId) where.fundId = query.fundId;
        if (query.type) where.type = query.type;
        if (query.status) where.status = query.status;


        if (user && user.role === UserRole.FUND_MANAGER) {
            const accessibleFundIds = user.accessibleFunds?.map(f => f.id) || [];
            where.fundId = { in: accessibleFundIds };
        }

        return this.prisma.document.findMany({
            where,
            include: { fund: { select: { name: true, code: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const doc = await this.prisma.document.findUnique({
            where: { id },
            include: {
                fund: true,
                uploadedBy: { select: { name: true, email: true } },
                auditLogs: { include: { user: { select: { name: true } } }, orderBy: { timestamp: 'desc' } }
            },
        });
        return doc;
    }

    async updateStatus(id: string, updateStatusDto: UpdateDocumentStatusDto, user: { id: string; role: UserRole }) {
        const doc = await this.findOne(id);
        if (!doc) throw new NotFoundException('Document not found');


        if (user.role === UserRole.FUND_MANAGER) {
            throw new ForbiddenException('Fund Managers cannot update status');
        }


        if (updateStatusDto.status === DocStatus.APPROVED && user.role !== UserRole.AUDITOR && user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only Auditors/Admins can approve');
        }

        const updated = await this.prisma.document.update({
            where: { id },
            data: { status: updateStatusDto.status },
        });

        await this.auditService.logAction(user.id, id, AuditAction.STATUS_CHANGED, {
            oldStatus: doc.status,
            newStatus: updateStatusDto.status,
            comment: updateStatusDto.comment,
        });

        return updated;
    }

    async remove(id: string) {
        const doc = await this.prisma.document.findUnique({ where: { id } });
        if (!doc) throw new NotFoundException('Document not found');

        return this.prisma.document.delete({ where: { id } });
    }
}
