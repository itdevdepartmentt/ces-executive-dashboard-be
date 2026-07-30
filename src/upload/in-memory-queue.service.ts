import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ExcelProcessor } from '../worker/excel.processor';

@Injectable()
export class InMemoryQueueService {
  private jobs = new Map<string, any>();
  private queue: { jobId: string; jobName: string; data: any }[] = [];
  private isProcessing = false;
  private readonly logger = new Logger(InMemoryQueueService.name);

  constructor(private readonly excelProcessor: ExcelProcessor) {}

  async addJob(jobName: string, data: any) {
    // Generate simple unique ID
    const jobId = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    
    // Status 'waiting' means it's in queue but not currently being processed (like BullMQ)
    this.jobs.set(jobId, {
      status: 'waiting', 
      progress: 0,
      createdAt: new Date(),
    });

    this.queue.push({ jobId, jobName, data });
    
    // Trigger processing if not already running
    this.processNext().catch(err => this.logger.error(err));

    return { id: jobId };
  }

  private async processNext() {
    // Prevent multiple parallel processing loops (Concurrency = 1)
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    // Process jobs sequentially one by one
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await this.processJob(task.jobId, task.jobName, task.data);
      }
    }
    
    this.isProcessing = false;
  }

  private async processJob(jobId: string, jobName: string, data: any) {
    const jobData = this.jobs.get(jobId);
    if (jobData) {
      jobData.status = 'active'; // Mark as currently running
    }

    const fakeJob = {
      id: jobId,
      name: jobName,
      data: data,
      // Add fake progress updater just in case they ever use it in the future
      updateProgress: async (progress: number) => {
        const j = this.jobs.get(jobId);
        if (j) j.progress = progress;
      }
    };

    try {
      // Execute the existing logic identically
      const result = await this.excelProcessor.process(fakeJob as any);
      
      this.jobs.set(jobId, { 
        status: 'completed', 
        result: result 
      });
      
      // Auto cleanup logic: delete from memory after 1 hour so RAM doesn't bloat
      setTimeout(() => this.jobs.delete(jobId), 3600 * 1000);
      
    } catch (error: any) {
      this.logger.error(`Job ${jobId} failed: ${error.message}`);
      this.jobs.set(jobId, { 
        status: 'failed', 
        error: error.message || 'Unknown processing error' 
      });
      
      // Keep failed jobs for 24 hours for debugging
      setTimeout(() => this.jobs.delete(jobId), 24 * 3600 * 1000);
    }
  }

  getJobStatus(jobId: string) {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }
    
    // Frontend expects 'active' when it's still running or waiting
    if (job.status === 'waiting' || job.status === 'active') {
      return { status: 'active', progress: job.progress };
    }
    
    return job; // returns {status: 'completed' | 'failed', result/error}
  }
}
