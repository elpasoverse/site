/**
 * El Paso Verse - Firebase Cloud Functions
 * Email sending with PDF attachments for onboarding
 *
 * SETUP INSTRUCTIONS:
 * 1. cd functions
 * 2. npm install
 * 3. Set up SendGrid API key: firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"
 * 4. Set sender email: firebase functions:config:set email.from="noreply@elpasoverse.com"
 * 5. Deploy: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const PDFDocument = require('pdfkit');

admin.initializeApp();
const db = admin.firestore();

// Initialize SendGrid with API key from Firebase config
sgMail.setApiKey(functions.config().sendgrid?.key || process.env.SENDGRID_API_KEY);

/**
 * Trigger: New document in emailQueue collection
 * Sends welcome email with PDF attachments
 */
exports.processEmailQueue = functions.firestore
    .document('emailQueue/{docId}')
    .onCreate(async (snap, context) => {
        const emailData = snap.data();
        const docId = context.params.docId;

        // Only process welcome_onboarding emails
        if (emailData.type !== 'welcome_onboarding') {
            console.log('Skipping non-onboarding email type:', emailData.type);
            return null;
        }

        try {
            // Mark as processing
            await snap.ref.update({ status: 'processing', processedAt: admin.firestore.FieldValue.serverTimestamp() });

            // Get user's waiver and grant data
            const waiverData = await getWaiverData(emailData.userId);
            const grantData = await getGrantData(emailData.userId);

            // Generate PDFs
            const waiverPdf = await generateWaiverPDF(emailData, waiverData);
            const grantPdf = await generateGrantPDF(emailData, grantData);

            // Send email
            const fromEmail = functions.config().email?.from || 'noreply@elpasoverse.com';

            const msg = {
                to: emailData.to,
                from: {
                    email: fromEmail,
                    name: 'El Paso Verse'
                },
                subject: 'Welcome to El Paso Verse - Your Participation Documents',
                html: generateEmailHTML(emailData),
                attachments: [
                    {
                        content: waiverPdf.toString('base64'),
                        filename: 'El_Paso_Verse_Participation_Waiver.pdf',
                        type: 'application/pdf',
                        disposition: 'attachment'
                    },
                    {
                        content: grantPdf.toString('base64'),
                        filename: 'El_Paso_Verse_PASO_Grant_Certificate.pdf',
                        type: 'application/pdf',
                        disposition: 'attachment'
                    }
                ]
            };

            await sgMail.send(msg);

            // Mark as sent
            await snap.ref.update({
                status: 'sent',
                sentAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log('Welcome email sent successfully to:', emailData.to);
            return { success: true };

        } catch (error) {
            console.error('Error processing email:', error);

            // Mark as failed
            await snap.ref.update({
                status: 'failed',
                error: error.message,
                failedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return { success: false, error: error.message };
        }
    });

/**
 * Get waiver acceptance data for a user
 */
async function getWaiverData(userId) {
    const snapshot = await db.collection('waiverAcceptances')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) {
        return { timestamp: new Date(), ipAddress: 'N/A' };
    }

    return snapshot.docs[0].data();
}

/**
 * Get grant acceptance data for a user
 */
async function getGrantData(userId) {
    const snapshot = await db.collection('grantAcceptances')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) {
        return { timestamp: new Date(), pasoAmount: 25 };
    }

    return snapshot.docs[0].data();
}

/**
 * Generate the waiver PDF document
 */
async function generateWaiverPDF(emailData, waiverData) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(18).font('Helvetica-Bold')
           .text('STANDARD PARTICIPATION INTAKE WAIVER', { align: 'center' });
        doc.fontSize(12).font('Helvetica')
           .text('Kamara / El Paso Verse – an Ind. Vision-Driven Creative Project', { align: 'center' });
        doc.moveDown(2);

        // Acceptance details
        doc.fontSize(10).font('Helvetica-Bold')
           .text('ACCEPTANCE RECORD', { underline: true });
        doc.font('Helvetica')
           .text(`Participant: ${emailData.displayName || emailData.to}`)
           .text(`Email: ${emailData.to}`)
           .text(`Date: ${formatDate(waiverData.timestamp)}`)
           .text(`IP Address: ${waiverData.ipAddress || 'Recorded'}`)
           .text(`Document Version: 1.0`);
        doc.moveDown(2);

        // Waiver content
        doc.fontSize(10).font('Helvetica-Bold').text('READ CAREFULLY BEFORE PARTICIPATING');
        doc.font('Helvetica').text('The undersigned ("Participant") acknowledges and agrees as follows:');
        doc.moveDown();

        const sections = [
            {
                title: '1. Nature and Spirit of the Project',
                content: 'This project forms part of the Kamara / El Paso Verse creative universe, an independent, long-term creative vision initiated and developed by Harry West, and sustained through the personal vision, goodwill, trust, and continued effort of its creator(s). The Participant acknowledges that this project would not exist but for the commitment and perseverance of its creator(s), that it is pioneering in spirit, carving its own path outside conventional production models, and that it is pursued against significant practical, financial, and structural obstacles, particularly in today\'s entertainment industry landscape. The project is developed on a best-efforts basis, with limited resources, progressive financing, and open-ended timelines, and may include films, short works, experimental productions, and related creative activities.'
            },
            {
                title: '2. Risk, Uncertainty, and No Guarantees',
                content: 'The Participant understands that development, financing, production, post-production, exploitation, and/or monetization may be delayed, paused, extended, or may not ultimately occur. No promises or guarantees have been made regarding funding, payment timing, completion, commercial success, distribution, or monetization. Participation is voluntary and undertaken with full awareness of these realities.'
            },
            {
                title: '3. Rewards, Goodwill, and Voluntary Contributions',
                content: 'Participation in the project may, but does not necessarily, give rise to recognition, opportunities, or future rewards. Any compensation, profit participation, ownership interest, credit, PASO allocation, or other benefit shall arise only if expressly set forth in a separate written agreement. No expectation of reward is implied by participation alone. Any assistance, contribution, service, resource, or support provided to the project is given voluntarily and in good faith, and shall be deemed gratuitous unless expressly agreed otherwise in a separate written contract.'
            },
            {
                title: '4. Entity-Only Responsibility and Waiver of Claims',
                content: 'Any contractual, financial, or labor obligations, if applicable, exist solely at the level of the producing entity, if any. The Participant agrees that no personal liability or recourse exists against any individual involved in the project, including the creator(s), director(s), producer(s), administrator(s), shareholder(s), or representatives, in their personal capacity. The Participant irrevocably waives any right to bring claims or proceedings—judicial or extrajudicial—against any such individual arising out of or related to participation in the project.'
            },
            {
                title: '5. No Blocking Actions; Personal Circumstances',
                content: 'Changes in the Participant\'s personal, financial, or emotional circumstances do not create any obligation on the project or its participants. The Participant agrees not to seek injunctive relief or any action intended to delay, block, or interfere with the project.'
            },
            {
                title: '6. Legal Limits',
                content: 'This waiver does not apply in cases of willful misconduct or fraud, solely to the extent finally determined by a competent court under applicable law.'
            },
            {
                title: '7. Informed Consent and Welcome',
                content: 'The Participant confirms that they have read and understood this document and consciously accept participation in a vision-driven, pioneering project operating within a challenging and uncertain industry environment.'
            }
        ];

        sections.forEach(section => {
            doc.font('Helvetica-Bold').text(section.title);
            doc.font('Helvetica').text(section.content, { align: 'justify' });
            doc.moveDown();
        });

        // Signature section
        doc.moveDown(2);
        doc.fontSize(10).font('Helvetica-Bold')
           .text('ELECTRONIC ACCEPTANCE', { underline: true });
        doc.font('Helvetica')
           .text(`This document was electronically accepted by ${emailData.displayName || emailData.to} on ${formatDate(waiverData.timestamp)}.`)
           .text('The acceptance was recorded with timestamp and IP address verification.');

        doc.end();
    });
}

/**
 * Generate the grant certificate PDF document
 */
async function generateGrantPDF(emailData, grantData) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Decorative border (simple)
        doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).stroke();
        doc.rect(35, 35, doc.page.width - 70, doc.page.height - 70).stroke();

        doc.moveDown(2);

        // Header
        doc.fontSize(24).font('Helvetica-Bold')
           .text('EL PASO VERSE', { align: 'center' });
        doc.fontSize(16)
           .text('PASO PARTICIPATION GRANT', { align: 'center' });
        doc.moveDown(2);

        // Certificate of Grant
        doc.fontSize(14).font('Helvetica-Bold')
           .text('Certificate of Grant', { align: 'center' });
        doc.moveDown(2);

        // Recipient
        doc.fontSize(11).font('Helvetica')
           .text('This PASO Participation Grant is issued to:', { align: 'center' });
        doc.fontSize(18).font('Helvetica-Bold')
           .text(emailData.displayName || emailData.to, { align: 'center' });
        doc.moveDown(2);

        // Amount
        doc.fontSize(11).font('Helvetica')
           .text('One-Time PASO Allocation:', { align: 'center' });
        doc.fontSize(36).font('Helvetica-Bold')
           .text(`${grantData.pasoAmount || emailData.pasoAmount || 25} PASO`, { align: 'center' });
        doc.moveDown(2);

        // Details
        doc.fontSize(10).font('Helvetica');

        doc.font('Helvetica-Bold').text('Purpose:');
        doc.font('Helvetica').text('PASO is granted as recognition of participation, belief, and alignment with the El Paso Verse journey. It reflects presence in the world-building process and contribution to the shared vision over time.', { align: 'justify' });
        doc.moveDown();

        doc.font('Helvetica-Bold').text('Usage:');
        doc.font('Helvetica').text('Within the El Paso Verse ecosystem, PASO may be used for participation in the El Paso Verse world; access to experiences, initiatives, or future layers of the project; and community and governance functions as they emerge.', { align: 'justify' });
        doc.moveDown();

        doc.font('Helvetica-Bold').text('Important:');
        doc.font('Helvetica').text('PASO is not equity, ownership, or a claim on profits. Its value is rooted in participation and belonging, not guarantees. Grant amounts are determined using high-level participation logic as described in the Vision Paper.', { align: 'justify' });
        doc.moveDown();

        doc.font('Helvetica-Bold').text('Liquidity & Evolution:');
        doc.font('Helvetica').text('PASO may evolve over time and may become transferable or tradable in the future, subject to the project\'s direction and applicable frameworks. No guarantee is made regarding liquidity, markets, or future value.', { align: 'justify' });
        doc.moveDown(2);

        // Signature
        doc.fontSize(10).font('Helvetica-Oblique')
           .text(`Granted on: ${formatDate(grantData.timestamp)}`, { align: 'right' });
        doc.font('Helvetica-Bold')
           .text('Harry West', { align: 'right' })
           .font('Helvetica')
           .text('on behalf of El Paso Verse', { align: 'right' });

        doc.end();
    });
}

/**
 * Generate the welcome email HTML
 */
function generateEmailHTML(emailData) {
    const name = emailData.displayName || 'Pioneer';
    const pasoAmount = emailData.pasoAmount || 25;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #F5E6D3; border: 3px solid #8B4513; max-width: 600px;">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #3A2820; padding: 30px; text-align: center;">
                            <h1 style="color: #C9A961; margin: 0; font-size: 28px; letter-spacing: 3px;">EL PASO VERSE</h1>
                            <p style="color: #F5E6D3; margin: 10px 0 0 0; font-size: 14px; letter-spacing: 2px;">WELCOME TO THE FRONTIER</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #3A2820; margin: 0 0 20px 0; font-size: 24px;">Welcome, ${name}</h2>

                            <p style="color: #3A2820; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                You are now officially part of the El Paso Verse community. Your journey into the 1880 frontier begins here.
                            </p>

                            <div style="background-color: #fff; border: 2px solid #C9A961; padding: 25px; margin: 30px 0; text-align: center;">
                                <p style="color: #8B4513; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your PASO Grant</p>
                                <p style="color: #C9A961; margin: 0; font-size: 48px; font-weight: bold;">${pasoAmount} PASO</p>
                            </div>

                            <p style="color: #3A2820; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Attached to this email, you will find your official participation documents:
                            </p>

                            <ul style="color: #3A2820; font-size: 15px; line-height: 1.8; margin: 0 0 30px 0; padding-left: 20px;">
                                <li><strong>Participation Waiver</strong> – Your signed agreement to participate in this vision-driven project</li>
                                <li><strong>PASO Grant Certificate</strong> – Official record of your PASO allocation</li>
                            </ul>

                            <p style="color: #3A2820; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                Keep these documents for your records. They represent your entry into a world that's being built piece by piece, story by story.
                            </p>

                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://elpasoverse.com/members.html" style="display: inline-block; background-color: #8B4513; color: #F5E6D3; padding: 15px 40px; text-decoration: none; font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                                    Enter the Community Portal
                                </a>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #3A2820; padding: 25px; text-align: center;">
                            <p style="color: #C9A961; margin: 0 0 10px 0; font-size: 12px;">
                                Adventure into 1880
                            </p>
                            <p style="color: #8B7355; margin: 0; font-size: 11px;">
                                © ${new Date().getFullYear()} El Paso Verse. A community-driven frontier.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
}

/**
 * Format a Firestore timestamp or Date to readable string
 */
function formatDate(timestamp) {
    if (!timestamp) return new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Handle Firestore Timestamp
    if (timestamp.toDate) {
        timestamp = timestamp.toDate();
    }

    // Handle string dates
    if (typeof timestamp === 'string') {
        timestamp = new Date(timestamp);
    }

    return timestamp.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Manual trigger to resend a failed email
 * Call via: firebase functions:call resendEmail --data '{"docId": "xxx"}'
 */
exports.resendEmail = functions.https.onCall(async (data, context) => {
    // Check if admin (optional - add your own auth check)
    const docId = data.docId;

    if (!docId) {
        throw new functions.https.HttpsError('invalid-argument', 'Document ID required');
    }

    const docRef = db.collection('emailQueue').doc(docId);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new functions.https.HttpsError('not-found', 'Email document not found');
    }

    // Reset status to trigger reprocessing
    await docRef.update({
        status: 'pending',
        retryAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Delete and recreate to trigger the onCreate function
    const emailData = doc.data();
    await docRef.delete();
    await db.collection('emailQueue').add({
        ...emailData,
        status: 'pending',
        retriedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: 'Email queued for resend' };
});
