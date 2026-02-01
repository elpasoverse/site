# El Paso Verse - Cloud Functions Setup

## Overview

This Firebase Cloud Function automatically sends welcome emails with PDF attachments when users complete the onboarding flow.

## Prerequisites

1. Firebase project with Blaze (pay-as-you-go) plan (required for external API calls)
2. SendGrid account with API key
3. Node.js 18+ installed locally
4. Firebase CLI installed (`npm install -g firebase-tools`)

## Setup Steps

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Get SendGrid API Key

1. Go to [SendGrid](https://sendgrid.com) and create a free account
2. Navigate to Settings → API Keys
3. Create an API key with "Mail Send" permissions
4. Copy the API key (you'll only see it once)

### 3. Configure Firebase Functions

```bash
# Login to Firebase
firebase login

# Set the SendGrid API key
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"

# Set the sender email (must be verified in SendGrid)
firebase functions:config:set email.from="noreply@elpasoverse.com"
```

### 4. Verify Sender Email in SendGrid

1. Go to SendGrid → Settings → Sender Authentication
2. Either verify a single sender email or set up domain authentication
3. Use the verified email in the `email.from` config

### 5. Deploy Functions

```bash
# Deploy from the project root
firebase deploy --only functions
```

### 6. Create Firestore Indexes (if needed)

The functions query the `waiverAcceptances` and `grantAcceptances` collections. If you see index errors in the logs, create composite indexes:

```
Collection: waiverAcceptances
Fields: userId (Ascending), timestamp (Descending)

Collection: grantAcceptances
Fields: userId (Ascending), timestamp (Descending)
```

## Testing

### Test Locally

```bash
cd functions
npm run serve
```

### View Logs

```bash
firebase functions:log
```

### Manual Email Resend

If an email fails, you can resend it:

```bash
firebase functions:call resendEmail --data '{"docId": "DOCUMENT_ID_HERE"}'
```

## Email Queue Structure

When a user completes onboarding, a document is added to `emailQueue`:

```javascript
{
  type: 'welcome_onboarding',
  to: 'user@example.com',
  userId: 'firebase-user-id',
  displayName: 'User Name',
  pasoAmount: 25,
  createdAt: Timestamp,
  status: 'pending',
  attachments: ['waiver', 'grant_certificate']
}
```

Status values: `pending` → `processing` → `sent` or `failed`

## Costs

- **Firebase Functions**: First 2M invocations/month free
- **SendGrid**: Free tier includes 100 emails/day
- **Estimated cost**: Essentially free for small-medium communities

## Troubleshooting

### "Permission denied" errors
- Ensure your Firebase project is on Blaze plan
- Check Firestore security rules allow function access

### Emails not sending
- Verify SendGrid API key is correct
- Check sender email is verified in SendGrid
- Look at function logs: `firebase functions:log`

### PDF generation errors
- Ensure pdfkit is installed: `npm install pdfkit`
- Check Node.js version is 18+

## Alternative: Zapier Integration

If you prefer not to use Cloud Functions, you can use Zapier:

1. Create a Zap triggered by "New Document in Firestore" (emailQueue collection)
2. Add SendGrid "Send Email" action
3. Use Zapier's PDF generation or skip attachments

This approach doesn't support PDF attachments as easily but is simpler to set up.
