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
import { MessageService } from '../services/message.service';
import {
  CreateMessageDto,
  UpdateMessageDto,
  MessageQueryDto,
  ServiceOfferMessageDto,
  BookingRequestMessageDto,
  LocationMessageDto,
  BulkMarkReadDto,
  MessageReactionDto,
} from '../dto/message.dto';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations/:conversationId/messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @ApiOperation({ summary: 'Send a new message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async create(
    @Param('conversationId') conversationId: string,
    @Body() createMessageDto: CreateMessageDto,
    @Request() req: any,
  ) {
    return this.messageService.create(
      conversationId,
      createMessageDto,
      req.user.id,
    );
  }

  @Post('service-offer')
  @ApiOperation({ summary: 'Send a service offer message' })
  @ApiResponse({ status: 201, description: 'Service offer sent successfully' })
  @ApiResponse({ status: 404, description: 'Service package not found' })
  async createServiceOffer(
    @Param('conversationId') conversationId: string,
    @Body() serviceOfferDto: ServiceOfferMessageDto,
    @Request() req: any,
  ) {
    return this.messageService.createServiceOffer(
      conversationId,
      serviceOfferDto,
      req.user.id,
    );
  }

  @Post('booking-request')
  @ApiOperation({ summary: 'Send a booking request message' })
  @ApiResponse({
    status: 201,
    description: 'Booking request sent successfully',
  })
  @ApiResponse({ status: 404, description: 'Service package not found' })
  async createBookingRequest(
    @Param('conversationId') conversationId: string,
    @Body() bookingRequestDto: BookingRequestMessageDto,
    @Request() req: any,
  ) {
    return this.messageService.createBookingRequest(
      conversationId,
      bookingRequestDto,
      req.user.id,
    );
  }

  @Post('location')
  @ApiOperation({ summary: 'Send a location message' })
  @ApiResponse({ status: 201, description: 'Location shared successfully' })
  async createLocationMessage(
    @Param('conversationId') conversationId: string,
    @Body() locationDto: LocationMessageDto,
    @Request() req: any,
  ) {
    return this.messageService.createLocationMessage(
      conversationId,
      locationDto,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get conversation messages with pagination' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async findConversationMessages(
    @Param('conversationId') conversationId: string,
    @Query() query: MessageQueryDto,
    @Request() req: any,
  ) {
    return this.messageService.findConversationMessages(
      conversationId,
      query,
      req.user.id,
    );
  }

  @Post('bulk-mark-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark multiple messages as read' })
  @ApiResponse({
    status: 204,
    description: 'Messages marked as read successfully',
  })
  async bulkMarkAsRead(
    @Param('conversationId') conversationId: string,
    @Body() bulkMarkReadDto: BulkMarkReadDto,
    @Request() req: any,
  ) {
    await this.messageService.bulkMarkAsRead(
      conversationId,
      bulkMarkReadDto,
      req.user.id,
    );
  }
}

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessageManagementController {
  constructor(private readonly messageService: MessageService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search messages across all conversations' })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  async searchMessages(
    @Query('q') searchQuery: string,
    @Request() req: any,
    @Query('limit') limit: number = 20,
  ) {
    return this.messageService.searchMessages(req.user.id, searchQuery, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get message by ID' })
  @ApiResponse({ status: 200, description: 'Message found' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async findById(@Param('id') id: string, @Request() req: any) {
    return this.messageService.findById(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edit message' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  @ApiResponse({ status: 403, description: 'Can only edit own messages' })
  @ApiResponse({
    status: 400,
    description: 'Cannot edit messages older than 24 hours',
  })
  async update(
    @Param('id') id: string,
    @Body() updateMessageDto: UpdateMessageDto,
    @Request() req: any,
  ) {
    return this.messageService.update(id, updateMessageDto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete message' })
  @ApiResponse({ status: 204, description: 'Message deleted successfully' })
  @ApiResponse({ status: 403, description: 'Can only delete own messages' })
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.messageService.delete(id, req.user.id);
  }

  @Delete(':id/for-me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete message for current user only' })
  @ApiResponse({
    status: 204,
    description: 'Message deleted for user successfully',
  })
  async deleteForUser(@Param('id') id: string, @Request() req: any) {
    await this.messageService.deleteForUser(id, req.user.id);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiResponse({
    status: 204,
    description: 'Message marked as read successfully',
  })
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    await this.messageService.markAsRead(id, req.user.id);
  }

  @Post(':id/reaction')
  @ApiOperation({ summary: 'Add reaction to message' })
  @ApiResponse({ status: 200, description: 'Reaction added successfully' })
  async addReaction(
    @Param('id') id: string,
    @Body() reactionDto: MessageReactionDto,
    @Request() req: any,
  ) {
    return this.messageService.addReaction(
      id,
      req.user.id,
      reactionDto.reaction,
    );
  }

  @Delete(':id/reaction')
  @ApiOperation({ summary: 'Remove reaction from message' })
  @ApiResponse({ status: 200, description: 'Reaction removed successfully' })
  async removeReaction(@Param('id') id: string, @Request() req: any) {
    return this.messageService.removeReaction(id, req.user.id);
  }

  @Get(':id/reads')
  @ApiOperation({ summary: 'Get message read receipts' })
  @ApiResponse({
    status: 200,
    description: 'Read receipts retrieved successfully',
  })
  async getMessageReads(@Param('id') id: string) {
    return this.messageService.getMessageReads(id);
  }
}
