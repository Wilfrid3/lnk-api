import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface VerificationCodeEmailData {
  email: string;
  code: string;
  name?: string;
  expiresInMinutes?: number;
}

export interface PasswordResetEmailData {
  email: string;
  resetLink: string;
  name?: string;
  expiresInMinutes?: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.createTransporter();
  }

  private createTransporter(): void {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !port || !user || !pass) {
      this.logger.warn(
        'SMTP configuration incomplete. Email sending disabled.',
      );
      this.logger.warn(
        `Missing: ${!host ? 'SMTP_HOST ' : ''}${!port ? 'SMTP_PORT ' : ''}${!user ? 'SMTP_USER ' : ''}${!pass ? 'SMTP_PASS' : ''}`,
      );
      return;
    }

    this.logger.log(
      `Configuring SMTP with host: ${host}, port: ${port}, user: ${user}`,
    );

    // Enhanced SMTP configuration with better compatibility
    const transportConfig: any = {
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      requireTLS: port === 587, // Explicitly require TLS for port 587 (STARTTLS)
      auth: {
        user,
        pass,
      },
      // More comprehensive TLS configuration for STARTTLS
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
        servername: host, // Ensure proper SNI
      },
      // Connection timeout settings
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 30000, // 30 seconds
      socketTimeout: 60000, // 60 seconds
      // Debugging options (only in development)
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development',
    };

    // Special configurations for common providers
    if (host.includes('gmail')) {
      transportConfig.service = 'gmail';
      transportConfig.tls = {
        rejectUnauthorized: false,
      };
    } else if (
      host.includes('outlook') ||
      host.includes('hotmail') ||
      host.includes('live')
    ) {
      transportConfig.service = 'hotmail';
    } else if (host.includes('yahoo')) {
      transportConfig.service = 'yahoo';
    }

    this.transporter = nodemailer.createTransport(transportConfig);

    // Enhanced connection verification with timeout
    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    if (!this.transporter) return;

    try {
      // Set a timeout for the verification
      const verifyPromise = new Promise((resolve, reject) => {
        this.transporter.verify((error, success) => {
          if (error) reject(error);
          else resolve(success);
        });
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Connection verification timeout')),
          30000,
        );
      });

      await Promise.race([verifyPromise, timeoutPromise]);
      this.logger.log('✅ SMTP server connection successful');
    } catch (error) {
      this.logger.error('❌ SMTP connection failed:');
      this.logger.error(error.message);

      // Provide specific troubleshooting based on error type
      if (error.code === 'EAUTH' || error.message.includes('authentication')) {
        this.logger.warn('🔐 Authentication Error Solutions:');
        this.logger.warn('1. Verify SMTP_USER and SMTP_PASS credentials');
        this.logger.warn(
          '2. For Gmail: Enable "Less secure apps" or use App Passwords',
        );
        this.logger.warn(
          '3. For Outlook: Use app-specific password if 2FA enabled',
        );
        this.logger.warn('4. Check if the email provider allows SMTP access');
      } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
        this.logger.warn('🌐 Connection Error Solutions:');
        this.logger.warn('1. Verify SMTP_HOST and SMTP_PORT are correct');
        this.logger.warn('2. Check firewall/network restrictions');
        this.logger.warn('3. Try different ports: 587 (STARTTLS) or 465 (SSL)');
        this.logger.warn(
          '4. Check if your IP is whitelisted with the provider',
        );
      } else if (error.code === 'ESOCKET') {
        this.logger.warn('🔌 Socket Error Solutions:');
        this.logger.warn('1. Check DNS resolution for SMTP host');
        this.logger.warn('2. Try using IP address instead of hostname');
        this.logger.warn('3. Check if SSL/TLS version is supported');
      }

      this.logger.warn('📧 Consider using these reliable alternatives:');
      this.logger.warn(
        '- Gmail SMTP: smtp.gmail.com:587 (requires app password)',
      );
      this.logger.warn('- SendGrid: smtp.sendgrid.net:587');
      this.logger.warn('- Mailgun: smtp.mailgun.org:587');
      this.logger.warn('- Amazon SES: email-smtp.region.amazonaws.com:587');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.error('Email transporter not configured');
      return false;
    }

    try {
      const fromName =
        this.configService.get<string>('SMTP_FROM_NAME') || 'LNK App';
      const fromEmail = this.configService.get<string>('SMTP_FROM');

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Email sent successfully to ${options.to}. Message ID: ${result.messageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  private loadTemplate(
    templateName: string,
    variables: Record<string, any>,
  ): string {
    try {
      // Try multiple possible paths for templates
      const possiblePaths = [
        // Production: relative to project root
        path.join(process.cwd(), 'src', 'email', 'templates', templateName),
        // Development: relative to current file
        path.join(__dirname, 'templates', templateName),
        // Alternative: relative to dist folder
        path.join(
          __dirname,
          '..',
          '..',
          'src',
          'email',
          'templates',
          templateName,
        ),
      ];

      let templatePath = '';
      let templateSource = '';

      // Find the first existing template file
      for (const testPath of possiblePaths) {
        this.logger.debug(`Checking template path: ${testPath}`);
        if (fs.existsSync(testPath)) {
          templatePath = testPath;
          templateSource = fs.readFileSync(templatePath, 'utf-8');
          this.logger.debug(
            `Template found at: ${templatePath}, length: ${templateSource.length}`,
          );
          break;
        }
      }

      if (!templateSource) {
        this.logger.error(
          `Template file not found in any of the following locations:`,
        );
        possiblePaths.forEach((p) => this.logger.error(`  - ${p}`));
        return '';
      }

      // Compile the Handlebars template
      const template = Handlebars.compile(templateSource);

      // Render the template with variables
      const renderedTemplate = template(variables);

      this.logger.debug(
        `Template rendered successfully, final length: ${renderedTemplate.length}`,
      );
      return renderedTemplate;
    } catch (error) {
      this.logger.error(`Failed to load template ${templateName}:`, error);
      return '';
    }
  }

  async sendVerificationCode(
    data: VerificationCodeEmailData,
  ): Promise<boolean> {
    const { email, code, name, expiresInMinutes = 10 } = data;

    const subject = 'Code de Vérification Email - YamoZone';
    const html = this.loadTemplate('verification-code.hbs', {
      greeting: name ? `Bonjour ${name},` : 'Bonjour,',
      code,
      expiresInMinutes,
    });
    const text = this.loadTemplate('verification-code-text.hbs', {
      greeting: name ? `Bonjour ${name},` : 'Bonjour,',
      code,
      expiresInMinutes,
    });

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendWelcomeEmail(email: string, name?: string): Promise<boolean> {
    const subject = 'Bienvenue sur YamoZone !';
    const greeting = name ? `Bonjour ${name},` : 'Bonjour,';

    const html = this.loadTemplate('welcome.hbs', { greeting });
    const text = this.loadTemplate('welcome-text.hbs', { greeting });

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    const { email, resetLink, name, expiresInMinutes = 30 } = data;

    const subject = 'Réinitialisation de mot de passe - YamoZone';
    const greeting = name ? `Bonjour ${name},` : 'Bonjour,';

    const html = this.loadTemplate('password-reset.hbs', {
      greeting,
      resetLink,
      expiresInMinutes: expiresInMinutes.toString(),
    });
    const text = this.loadTemplate('password-reset-text.hbs', {
      greeting,
      resetLink,
      expiresInMinutes: expiresInMinutes.toString(),
    });

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }
}
