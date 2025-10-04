# SentryCircle

SentryCircle is a comprehensive child safety and digital wellness application that helps parents monitor their children's device usage, location, and digital activities while respecting privacy through zero-knowledge proofs.

## Project Overview

SentryCircle combines parental controls with digital wellness features to create a balanced approach to child safety in the digital age. The application consists of:

1. **Mobile App for Children**: A React Native application that runs on children's devices to monitor usage and location
2. **Parent Dashboard**: A web interface for parents to view their children's activities and manage settings
3. **Cloudflare Backend**: A serverless backend implementation using Cloudflare Workers and KV storage

## Key Features

- **Real-time Location Tracking**: Monitor children's location with privacy-preserving features
- **Digital Citizenship Score**: Gamified system to encourage healthy digital habits
- **Device Control**: Remote device locking and app usage management
- **Family Management**: Support for multiple children and guardians
- **Cost-Effective Implementation**: Leverages Cloudflare's free tier for minimal infrastructure costs

## Repository Structure

- `/cloudflare-worker`: Serverless backend implementation using Cloudflare Workers
- `/mobile-app`: React Native application for children's devices
- `/docs`: Implementation guides and architecture documentation

## Getting Started

### Prerequisites

- Node.js 16+
- React Native development environment
- Cloudflare account (free tier is sufficient)

### Backend Setup

1. Create a Cloudflare account
2. Set up KV namespaces for data storage
3. Deploy the Worker using Wrangler CLI:

```bash
cd cloudflare-worker
wrangler publish
```

### Mobile App Setup

1. Install dependencies:

```bash
cd mobile-app
npm install
```

2. Configure the app with your Cloudflare Worker URL:

```bash
cp .env.example .env
# Edit .env with your Worker URL
```

3. Run the app:

```bash
npm run android
# or
npm run ios
```

## Documentation

- [Cost-Effective Implementation Guide](./SENTRYCIRCLE_COST_EFFECTIVE_IMPLEMENTATION.md)
- [Functional Map](./SENTRYCIRCLE_FUNCTIONAL_MAP.md)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Cloudflare for providing free tier services that make this implementation cost-effective
- React Native community for the excellent mobile development framework
