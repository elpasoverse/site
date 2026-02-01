/**
 * El Paso Verse - Signup Protection System
 * Prevents abuse of signup bonuses through multiple measures:
 * 1. Disposable email domain blocking
 * 2. IP-based rate limiting
 * 3. Device fingerprinting
 */

// ============================================
// 1. DISPOSABLE EMAIL DOMAIN BLOCKING
// ============================================

const DISPOSABLE_EMAIL_DOMAINS = [
    // Common disposable email services
    'mailinator.com', 'mailinator2.com', 'mailinater.com',
    'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com',
    'tempmail.com', 'temp-mail.org', 'tempmail.net', 'temp-mail.io',
    '10minutemail.com', '10minutemail.net', '10minmail.com',
    'throwaway.email', 'throwawaymail.com',
    'fakeinbox.com', 'fakemailgenerator.com',
    'getnada.com', 'nada.email',
    'mailnesia.com', 'mailnator.com',
    'dispostable.com', 'disposablemail.com',
    'yopmail.com', 'yopmail.fr', 'yopmail.net',
    'sharklasers.com', 'spam4.me', 'grr.la', 'guerrillamail.info',
    'pokemail.net', 'spamgourmet.com',
    'mytrashmail.com', 'trashmail.com', 'trashmail.net',
    'mailcatch.com', 'mailscrap.com',
    'tempinbox.com', 'tempr.email', 'tempsky.com',
    'discard.email', 'discardmail.com',
    'spambox.us', 'spamfree24.org', 'spamherelots.com',
    'mailfence.com', 'getairmail.com',
    'mohmal.com', 'emailondeck.com',
    'mintemail.com', 'tempail.com',
    'burnermail.io', 'burnermailapp.com',
    'inboxalias.com', 'jetable.org',
    'maildrop.cc', 'mailsac.com',
    'receivesms.co', 'sms-receive.net',
    'crazymailing.com', 'deadaddress.com',
    'einrot.com', 'emailtemporar.ro',
    'fakemailgenerator.net', 'fakemail.fr',
    'filzmail.com', 'fleckens.hu',
    'get2mail.fr', 'getonemail.com',
    'haltospam.com', 'hotmailproduct.com',
    'imgof.com', 'imstations.com',
    'incognitomail.com', 'ipoo.org',
    'irish2me.com', 'jetable.com',
    'kasmail.com', 'kaspop.com',
    'keepmymail.com', 'killmail.com',
    'klzlv.com', 'kulturbetrieb.info',
    'kurzepost.de', 'lawlita.com',
    'letthemeatspam.com', 'lhsdv.com',
    'lifebyfood.com', 'link2mail.net',
    'litedrop.com', 'lol.ovpn.to',
    'lookugly.com', 'lortemail.dk',
    'lovemeleaveme.com', 'lr78.com',
    'maboard.com', 'mail-hierarchycompare.pl',
    'mail-hierarchylabs.eu', 'mail2rss.org',
    'mail333.com', 'mail4trash.com',
    'mailbidon.com', 'mailblocks.com',
    'mailbucket.org', 'mailcat.biz',
    'mailcheap.co', 'mailde.de',
    'mailde.info', 'maildx.com',
    'mailed.ro', 'mailexpire.com',
    'mailfa.tk', 'mail-hierarchyforge.tk',
    'mailfreeonline.com', 'mailguard.me',
    'mailhazard.com', 'mailhazard.us',
    'mailhz.me', 'mailimate.com',
    'mailin8r.com', 'mailinater.com',
    'mailincubator.com', 'mailismagic.com',
    'mailjunk.cf', 'mailjunk.ga',
    'mailjunk.gq', 'mailjunk.ml',
    'mailjunk.tk', 'mailmate.com',
    'mailme.gq', 'mailme.ir',
    'mailme.lv', 'mailme24.com',
    'mailmetrash.com', 'mailmoat.com',
    'mailnull.com', 'mailorg.org',
    'mailpick.biz', 'mailproxsy.com',
    'mailquack.com', 'mailrock.biz',
    'mailsac.com', 'mailscrap.com',
    'mailseal.de', 'mailshell.com',
    'mailsiphon.com', 'mailslapping.com',
    'mailslite.com', 'mailspam.xyz',
    'mailtemp.info', 'mailtothis.com',
    'mailzilla.com', 'mailzilla.org',
    'anonymbox.com', 'anonymousemail.me',
    'antispam.de', 'binkmail.com',
    'bobmail.info', 'bofthew.com',
    'bootybay.de', 'boun.cr',
    'bouncr.com', 'boxformail.in',
    'brefmail.com', 'brennendesreich.de',
    'broadbandninja.com', 'bsnow.net',
    'buffemail.com', 'bugmenever.com',
    'bumpymail.com', 'bund.us',
    'bundes-li.ga', 'burnthespam.info',
    'buymoreplays.com', 'byom.de',
    'cachedot.net', 'card.zp.ua',
    'casualdx.com', 'cek.pm',
    'cellurl.com', 'cem.net',
    'centermail.com', 'centermail.net',
    'chammy.info', 'cheatmail.de'
];

/**
 * Check if an email domain is disposable/temporary
 * @param {string} email - Email address to check
 * @returns {boolean} - True if disposable, false if legitimate
 */
function isDisposableEmail(email) {
    if (!email || typeof email !== 'string') return false;

    const domain = email.toLowerCase().split('@')[1];
    if (!domain) return false;

    return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

// ============================================
// 2. IP-BASED RATE LIMITING
// ============================================

const IP_RATE_LIMIT = {
    maxSignupsPerIP: 3,        // Maximum signups per IP
    windowHours: 24            // Time window in hours
};

/**
 * Get the user's IP address using a free API
 * @returns {Promise<string|null>} - IP address or null if unavailable
 */
async function getUserIP() {
    try {
        // Try multiple IP services for reliability
        const services = [
            'https://api.ipify.org?format=json',
            'https://api64.ipify.org?format=json'
        ];

        for (const service of services) {
            try {
                const response = await fetch(service, { timeout: 5000 });
                if (response.ok) {
                    const data = await response.json();
                    return data.ip;
                }
            } catch (e) {
                continue;
            }
        }
        return null;
    } catch (error) {
        console.warn('Could not fetch IP address:', error);
        return null;
    }
}

/**
 * Check if IP has exceeded signup rate limit
 * @param {string} ip - IP address to check
 * @returns {Promise<{allowed: boolean, remainingSignups: number}>}
 */
async function checkIPRateLimit(ip) {
    if (!ip || !db) {
        return { allowed: true, remainingSignups: IP_RATE_LIMIT.maxSignupsPerIP };
    }

    try {
        const windowStart = new Date();
        windowStart.setHours(windowStart.getHours() - IP_RATE_LIMIT.windowHours);

        // Query signups from this IP in the time window
        const snapshot = await db.collection('signupAttempts')
            .where('ip', '==', ip)
            .where('timestamp', '>', windowStart)
            .get();

        const signupCount = snapshot.size;
        const allowed = signupCount < IP_RATE_LIMIT.maxSignupsPerIP;
        const remainingSignups = Math.max(0, IP_RATE_LIMIT.maxSignupsPerIP - signupCount);

        return { allowed, remainingSignups, currentCount: signupCount };
    } catch (error) {
        console.error('Error checking IP rate limit:', error);
        // Allow on error to not block legitimate users
        return { allowed: true, remainingSignups: IP_RATE_LIMIT.maxSignupsPerIP };
    }
}

/**
 * Record a signup attempt from an IP
 * @param {string} ip - IP address
 * @param {string} email - Email used for signup
 * @param {string} fingerprint - Device fingerprint (optional)
 */
async function recordSignupAttempt(ip, email, fingerprint = null) {
    if (!db) return;

    try {
        await db.collection('signupAttempts').add({
            ip: ip || 'unknown',
            email: email,
            fingerprint: fingerprint,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userAgent: navigator.userAgent
        });
    } catch (error) {
        console.error('Error recording signup attempt:', error);
    }
}

// ============================================
// 3. DEVICE FINGERPRINTING
// ============================================

let cachedFingerprint = null;

/**
 * Generate a device fingerprint using browser characteristics
 * This is a simple implementation - for production, consider FingerprintJS Pro
 * @returns {Promise<string>} - Device fingerprint hash
 */
async function getDeviceFingerprint() {
    if (cachedFingerprint) return cachedFingerprint;

    try {
        const components = [];

        // Screen properties
        components.push(screen.width + 'x' + screen.height);
        components.push(screen.colorDepth);
        components.push(screen.pixelDepth);

        // Timezone
        components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
        components.push(new Date().getTimezoneOffset());

        // Language
        components.push(navigator.language);
        components.push(navigator.languages ? navigator.languages.join(',') : '');

        // Platform
        components.push(navigator.platform);
        components.push(navigator.hardwareConcurrency || 'unknown');
        components.push(navigator.deviceMemory || 'unknown');

        // Browser capabilities
        components.push(navigator.cookieEnabled);
        components.push(!!window.localStorage);
        components.push(!!window.sessionStorage);
        components.push(!!window.indexedDB);

        // WebGL renderer (unique per GPU)
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
                    components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
                }
            }
        } catch (e) {
            components.push('webgl-error');
        }

        // Canvas fingerprint
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('El Paso Verse', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('El Paso Verse', 4, 17);
            components.push(canvas.toDataURL());
        } catch (e) {
            components.push('canvas-error');
        }

        // Create hash from components
        const fingerprintString = components.join('|||');
        cachedFingerprint = await hashString(fingerprintString);

        return cachedFingerprint;
    } catch (error) {
        console.error('Error generating fingerprint:', error);
        return 'error-' + Date.now();
    }
}

/**
 * Simple hash function for fingerprint
 * @param {string} str - String to hash
 * @returns {Promise<string>} - Hash string
 */
async function hashString(str) {
    if (window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
        // Fallback simple hash
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'simple-' + Math.abs(hash).toString(16);
    }
}

/**
 * Check if device fingerprint has already been used for signup bonus
 * @param {string} fingerprint - Device fingerprint
 * @returns {Promise<{isNew: boolean, existingEmail: string|null}>}
 */
async function checkDeviceFingerprint(fingerprint) {
    if (!fingerprint || !db) {
        return { isNew: true, existingEmail: null };
    }

    try {
        // Check if this fingerprint exists in users collection
        const snapshot = await db.collection('users')
            .where('deviceFingerprint', '==', fingerprint)
            .where('signupBonusGranted', '==', true)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const existingUser = snapshot.docs[0].data();
            return { isNew: false, existingEmail: existingUser.email };
        }

        return { isNew: true, existingEmail: null };
    } catch (error) {
        console.error('Error checking device fingerprint:', error);
        return { isNew: true, existingEmail: null };
    }
}

// ============================================
// 4. RECAPTCHA INTEGRATION
// ============================================

let recaptchaWidgetId = null;
let recaptchaReady = false;

/**
 * Initialize reCAPTCHA on the page
 * @param {string} containerId - ID of the container element for reCAPTCHA
 * @param {string} siteKey - Google reCAPTCHA site key
 */
function initRecaptcha(containerId, siteKey) {
    if (!siteKey || siteKey === 'YOUR_RECAPTCHA_SITE_KEY') {
        console.warn('reCAPTCHA site key not configured');
        recaptchaReady = true; // Allow signup without reCAPTCHA if not configured
        return;
    }

    // Wait for grecaptcha to load
    const checkRecaptcha = setInterval(() => {
        if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
            clearInterval(checkRecaptcha);
            try {
                recaptchaWidgetId = grecaptcha.render(containerId, {
                    'sitekey': siteKey,
                    'callback': onRecaptchaSuccess,
                    'expired-callback': onRecaptchaExpired
                });
                recaptchaReady = true;
                console.log('reCAPTCHA initialized');
            } catch (e) {
                console.error('Error rendering reCAPTCHA:', e);
                recaptchaReady = true; // Allow signup if reCAPTCHA fails to load
            }
        }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
        clearInterval(checkRecaptcha);
        if (!recaptchaReady) {
            console.warn('reCAPTCHA failed to load, allowing signup');
            recaptchaReady = true;
        }
    }, 10000);
}

function onRecaptchaSuccess(token) {
    console.log('reCAPTCHA verified');
}

function onRecaptchaExpired() {
    console.log('reCAPTCHA expired');
    if (typeof grecaptcha !== 'undefined' && recaptchaWidgetId !== null) {
        grecaptcha.reset(recaptchaWidgetId);
    }
}

/**
 * Check if reCAPTCHA is verified
 * @returns {boolean}
 */
function isRecaptchaVerified() {
    // If reCAPTCHA not configured, allow through
    if (typeof grecaptcha === 'undefined' || recaptchaWidgetId === null) {
        return true;
    }

    const response = grecaptcha.getResponse(recaptchaWidgetId);
    return response && response.length > 0;
}

/**
 * Reset reCAPTCHA widget
 */
function resetRecaptcha() {
    if (typeof grecaptcha !== 'undefined' && recaptchaWidgetId !== null) {
        grecaptcha.reset(recaptchaWidgetId);
    }
}

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

/**
 * Validate signup attempt with all protection measures
 * @param {string} email - Email address
 * @returns {Promise<{valid: boolean, error: string|null, fingerprint: string|null, ip: string|null}>}
 */
async function validateSignupAttempt(email) {
    const result = {
        valid: true,
        error: null,
        fingerprint: null,
        ip: null,
        bonusEligible: true
    };

    // 1. Check disposable email
    if (isDisposableEmail(email)) {
        result.valid = false;
        result.error = 'Please use a permanent email address. Temporary or disposable emails are not allowed.';
        return result;
    }

    // 2. Check reCAPTCHA (if configured)
    if (!isRecaptchaVerified()) {
        result.valid = false;
        result.error = 'Please complete the reCAPTCHA verification.';
        return result;
    }

    // 3. Get IP and check rate limit
    result.ip = await getUserIP();
    if (result.ip) {
        const ipCheck = await checkIPRateLimit(result.ip);
        if (!ipCheck.allowed) {
            result.valid = false;
            result.error = 'Too many signup attempts from your location. Please try again later.';
            return result;
        }
    }

    // 4. Get device fingerprint and check
    result.fingerprint = await getDeviceFingerprint();
    const fingerprintCheck = await checkDeviceFingerprint(result.fingerprint);
    if (!fingerprintCheck.isNew) {
        // Don't block signup, but mark as not eligible for bonus
        result.bonusEligible = false;
        console.log('Device fingerprint already used for signup bonus');
    }

    return result;
}

// Export functions for use in other scripts
window.SignupProtection = {
    isDisposableEmail,
    validateSignupAttempt,
    recordSignupAttempt,
    getDeviceFingerprint,
    checkDeviceFingerprint,
    getUserIP,
    checkIPRateLimit,
    initRecaptcha,
    isRecaptchaVerified,
    resetRecaptcha
};
