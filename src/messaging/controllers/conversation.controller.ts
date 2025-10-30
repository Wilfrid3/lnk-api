import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConversationService } from '../services/conversation.service';
import {
  CreateConversationDto,
  UpdateConversationDto,
  ConversationQueryDto,
} from '../dto/conversation.dto';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createConversationDto: CreateConversationDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub || req.user?._id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    return this.conversationService.create(createConversationDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get user conversations with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved successfully',
  })
  async findUserConversations(
    @Query() query: ConversationQueryDto,
    @Request() req: any,
  ) {
    return this.conversationService.findUserConversations(req.user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiResponse({ status: 200, description: 'Conversation found' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async findById(@Param('id') id: string, @Request() req: any) {
    return this.conversationService.findById(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update conversation' })
  @ApiResponse({
    status: 200,
    description: 'Conversation updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only group admin can update',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async update(
    @Param('id') id: string,
    @Body() updateConversationDto: UpdateConversationDto,
    @Request() req: any,
  ) {
    return this.conversationService.update(
      id,
      updateConversationDto,
      req.user.id,
    );
  }

  @Put(':id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive conversation' })
  @ApiResponse({
    status: 204,
    description: 'Conversation archived successfully',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async archive(@Param('id') id: string, @Request() req: any) {
    await this.conversationService.archive(id, req.user.id);
  }

  @Put(':id/unarchive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unarchive conversation' })
  @ApiResponse({
    status: 204,
    description: 'Conversation unarchived successfully',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async unarchive(@Param('id') id: string, @Request() req: any) {
    await this.conversationService.unarchive(id, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete conversation for current user' })
  @ApiResponse({
    status: 204,
    description: 'Conversation deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.conversationService.delete(id, req.user.id);
  }

  @Get(':id/unread-count')
  @ApiOperation({ summary: 'Get unread message count for conversation' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
  })
  async getUnreadCount(@Param('id') id: string, @Request() req: any) {
    const count = await this.conversationService.getUnreadCount(
      id,
      req.user.id,
    );
    return { conversationId: id, unreadCount: count };
  }
}
