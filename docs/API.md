# API Documentation

This document provides a comprehensive reference for the Lawyer Admin Backend API.

Base URL: `http://localhost:5025/api` (unless otherwise noted, some routes might be mounted at root `/api` or deeper).

## Table of Contents
1. [Authentication](#authentication)
2. [Dashboard](#dashboard)
3. [Bookings & Availability](#bookings--availability)
4. [Appointments](#appointments)
5. [Payments](#payments)
6. [Blogs](#blogs)
7. [Support Tickets](#support-tickets)
8. [Profile](#profile)
9. [Settings](#settings)

---

## Authentication
Base Path: `/api/auth`

| Method | Endpoint | Description | Request Body |
| :--- | :--- | :--- | :--- |
| POST | `/register` | Register a new user | `{ email, password, fullName, ... }` |
| POST | `/login` | Authenticate user | `{ email, password }` |

## Dashboard
Base Path: `/api/dashboard`

| Method | Endpoint | Description | Response |
| :--- | :--- | :--- | :--- |
| GET | `/stats` | Get dashboard statistics (earnings, counts) | `{ stats: { totalEarnings, upcomingConsultations, ... } }` |
| GET | `/revenue` | Get monthly revenue data for charts | `{ monthlyRevenue: [...] }` |
| GET | `/services` | Get service distribution data | `{ serviceDistribution: [...] }` |
| GET | `/transactions` | Get recent transactions (raw bookings) | `{ recentTransactions: [...] }` |

## Bookings & Availability
Base Path: `/api` (See specific paths below)

| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| GET | `/booking-prefs/availability` | Get availability slots & blackouts | `userId` |
| POST | `/booking-prefs/availability/slots` | Add availability intervals | `userId`, Body: `{ recurringSlots: [] }` |
| DELETE | `/booking-prefs/availability/slots` | Delete a slot | `userId`, Body: `{ index }` |
| POST | `/booking-prefs/availability/blackouts` | Add blackout date range | `userId`, Body: `{ dateRange, reason }` |
| DELETE | `/booking-prefs/availability/blackouts` | Delete blackout | `userId`, Body: `{ index }` |
| GET | `/booking-prefs/hours` | Get weekly working hours | `userId` |
| PUT | `/booking-prefs/hours` | Update working hours | `userId`, Body: `{ weekly: {...} }` |
| GET | `/booking-prefs/settings` | Get booking rules/settings | `userId` |
| PUT | `/booking-prefs/settings` | Update booking rules | `userId`, Body: `{ ...settings }` |
| GET | `/booking-prefs/timezone` | Get configured timezone | `userId` |
| PUT | `/booking-prefs/timezone` | Update timezone | `userId`, Body: `{ timezone }` |
| GET | `/calendar-sync/settings` | Get calendar sync status | `userId` |

## Appointments
Base Path: `/api`

| Method | Endpoint | Description | Params / Body |
| :--- | :--- | :--- | :--- |
| POST | `/appointments` | Create a new booking | `{ userId, clientName, serviceType, date, ... }` |
| GET | `/appointments/history/:userId` | Get booking/appointment history | Path: `userId` |

## Payments
Base Path: `/api/payments`

| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| GET | `/summary` | Get payment/revenue summary | `userId` |
| GET | `/history` | Get payment transaction history | `userId`, `page`, `limit`, `status`, `q` |
| POST | `/:id/approve` | Approve a pending payment manually | Path: `id` |

## Blogs
Base Path: `/api/blogs`

| Method | Endpoint | Description | Notes |
| :--- | :--- | :--- | :--- |
| GET | `/` | Get all blog posts | |
| GET | `/:id` | Get single blog post | |
| POST | `/` | Create a blog post | Multipart form (image, title, content) |
| PUT | `/:id` | Update a blog post | Multipart form |
| DELETE | `/:id` | Delete a blog post | |
| POST | `/:id/toggle` | Toggle publish status | |

## Support Tickets
Base Path: `/api/support`

| Method | Endpoint | Description | Notes |
| :--- | :--- | :--- | :--- |
| GET | `/tickets` | Get all support tickets | |
| POST | `/tickets` | Create a ticket | Multipart (`attachment`), Body: `{ subject, message, priority }` |
| POST | `/tickets/:id/close` | Close a ticket | |
| DELETE | `/tickets/:id` | Delete a ticket | |

## Profile
Base Path: `/api`

| Method | Endpoint | Description | Notes |
| :--- | :--- | :--- | :--- |
| GET | `/profile/:userId` | Get user profile | |
| PUT | `/profile/:userId` | Update user profile | |
| POST | `/profile/upload-avatar` | Upload profile picture | Multipart (`avatar`) |
| POST | `/profile/password` | Update password | body: `{ userId, currentPassword, newPassword }` |
| GET | `/payouts/:userId` | Get payout methods | |
| POST | `/payouts` | Update payout methods | Body: `{ userId, bankTransfer, ... }` |

## Settings
Base Path: `/api/settings`

| Method | Endpoint | Description | Notes |
| :--- | :--- | :--- | :--- |
| GET | `/:userId` | Get general settings | |
| PUT | `/:userId` | Update general settings | |
