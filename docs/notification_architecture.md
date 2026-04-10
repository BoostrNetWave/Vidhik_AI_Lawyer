# Legal-Admin: Notification Architecture Documentation

This document outlines the current state and proposed architecture for the notification system within the `legal-admin` project.

## 1. Current Status Overview
As of the current codebase review, the `legal-admin` project **does not have a centralized notification system**. 

- **Frontend:** There are no components dedicated to notification centers, toast alerts, or real-time status updates from the server.
- **Backend:** The server handles CRUD operations for blogs, bookings, and support tickets, but lacks logic for triggering emails, SMS, or socket-based alerts.

---

## 2. Proposed Architecture (Next Steps)

To maintain the professional and premium nature of the application, a multi-channel notification system is recommended.

### A. Database Strategy (`Mongoose`)
A dedicated collection to track user-specific alerts.

```javascript
// models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['BOOKING', 'SUPPORT', 'PAYMENT', 'SYSTEM'], 
    default: 'SYSTEM' 
  },
  priority: { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], 
    default: 'MEDIUM' 
  },
  read: { type: Boolean, default: false },
  metadata: { type: Object }, // To store links, ticket IDs, or booking IDs
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Notification', notificationSchema);
```

### B. Implementation Channels

| Channel | Technology | Use Case |
| :--- | :--- | :--- |
| **Real-time** | `Socket.io` | Instant updates on the dashboard while the user is active. |
| **Persistent** | `In-App Inbox` | A sidebar or top-bar listing of recent events for historical review. |
| **External** | `Nodemailer` | Important legal updates, password resets, and booking confirmations. |
| **Immediate** | `Toasts` | Brief UI feedback (e.g., "Settings Saved Successfully"). |

---

## 3. Integration Points

Based on the existing feature set, these are the primary triggers for notifications:

### Booking Management
- **Trigger:** New booking submitted by a client.
- **Action:** Send "Urgent" notification to Admin; Email confirmation to Client.
- **Location:** `BookingManagementPage.jsx` logic.

### Support System
- **Trigger:** New support ticket created.
- **Action:** Notify Support team; Dashboard alert for User.
- **Location:** `supportController.js` -> `createTicket` function.

### System Updates
- **Trigger:** Timezone or Working Hour changes.
- **Action:** System-wide confirmation toast.
- **Location:** `TimezoneModal.jsx` and `WorkingHoursModal.jsx`.

---

## 4. Implementation Checklist

1. [ ] Create `Notification.js` model in backend.
2. [ ] Develop `notificationController.js` and routes.
3. [ ] Integrate `Socket.io` in the Express server.
4. [ ] Create a `NotificationBell` component in the frontend.
5. [ ] Install and configure a toast library (e.g., `react-hot-toast`).

---

> [!IMPORTANT]
> Since this is a legal platform, notifications regarding appointments and support tickets should be treated with high priority to ensure compliance and timely consultation.
