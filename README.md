# LNK API - Service Marketplace & Messaging Platform

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## Overview

LNK API is a comprehensive service marketplace platform with real-time messaging capabilities, built with NestJS, MongoDB, Redis, and Socket.IO. The platform enables users to offer services, connect with each other, and communicate through a full-featured chat system.

## 🚀 Key Features

### 💬 **Real-time Messaging System**
- **WebSocket Communication**: Instant messaging with Socket.IO
- **Service Integration**: Service offers and booking requests within chat
- **Real-time Notifications**: Live updates for messages, conversations, and user status
- **File Sharing**: Images, videos, audio, and documents support
- **Advanced Features**: Typing indicators, read receipts, online presence

### 🛍️ **Service Marketplace**
- User service packages and profiles
- Service discovery and booking
- Rating and review system
- Featured services and categories

### 🔧 **Technical Stack**
- **Backend**: NestJS (Node.js + TypeScript)
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO WebSockets
- **Caching**: Redis for sessions and presence
- **Authentication**: JWT with Passport
- **Documentation**: Swagger/OpenAPI
- **Monitoring**: Prometheus metrics + Grafana

## 📡 Socket Event Notifications

The messaging system provides real-time notifications through WebSocket events:

### Core Events
- `new_message` - Triggered when messages are created
- `message_updated` - Triggered when messages are edited  
- `new_conversation` - Triggered when conversations are created
- `user_typing` - Real-time typing indicators
- `user_online_status` - Online presence tracking

### WebSocket Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001/chat', {
  auth: { token: 'your-jwt-token' }
});

socket.on('new_message', (data) => {
  console.log('New message:', data.message);
});
```

## 📚 Documentation

- **[Complete Messaging Documentation](./MESSAGING_SYSTEM_DOCUMENTATION.md)** - Detailed API reference
- **[Video Comments API](./VIDEO_COMMENTS_API.md)** - Video interaction features  
- **[User Endpoints](./USER_ENDPOINTS_DOCUMENTATION.md)** - User management APIs
- **[Email Integration](./EMAIL_MODULE_DOCUMENTATION.md)** - Email service setup

## Description

Modern service marketplace API built with [NestJS](https://github.com/nestjs/nest) framework featuring real-time messaging, user management, and service booking capabilities.

## 🚀 Quick Start

### 1. Installation & Setup
```bash
# Install dependencies
$ npm install

# Set up environment variables
$ cp .env.example .env

# Start development server
$ npm run start:dev
```

### 2. API Access
- **REST API**: `http://localhost:3001/api`
- **WebSocket**: `ws://localhost:3001/chat`
- **Documentation**: `http://localhost:3001/docs`

### 3. Test Socket Events
```bash
# Run socket event test
$ node test_socket_events.js
```

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
