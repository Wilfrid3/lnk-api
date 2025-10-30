import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AnalyticsEvent,
  AnalyticsEventDocument,
} from './schemas/analytics-event.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(AnalyticsEvent.name)
    private analyticsEventModel: Model<AnalyticsEventDocument>,
  ) {}

  async trackEvent(
    eventName: string,
    category: string,
    userId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.analyticsEventModel.create({
      eventName,
      category,
      userId,
      metadata,
      timestamp: new Date(),
    });
  }

  async getEvents(
    filter: {
      startDate?: Date;
      endDate?: Date;
      category?: string;
      eventName?: string;
      userId?: string;
    },
    limit = 100,
    skip = 0,
  ): Promise<AnalyticsEventDocument[]> {
    const query: any = {};

    if (filter.startDate || filter.endDate) {
      query.timestamp = {};
      if (filter.startDate) {
        query.timestamp.$gte = filter.startDate;
      }
      if (filter.endDate) {
        query.timestamp.$lte = filter.endDate;
      }
    }

    if (filter.category) {
      query.category = filter.category;
    }

    if (filter.eventName) {
      query.eventName = filter.eventName;
    }

    if (filter.userId) {
      query.userId = filter.userId;
    }

    return this.analyticsEventModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }
}
