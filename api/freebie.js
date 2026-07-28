// API Handler for Freebies (Medanpedia SMM)
// Runs on Vercel Serverless (Node.js 18+)

// In-memory rate limiting map (IP -> Timestamp)
const ipCache = new Map();

// Helper to clean up cache periodically to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamp] of ipCache.entries()) {
        if (now - timestamp > 24 * 60 * 60 * 1000) {
            ipCache.delete(ip);
        }
    }
}, 60 * 60 * 1000); // run every hour

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Get IP Address
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress;

    // Check rate limit (1 claim per 24 hours per IP)
    const now = Date.now();
    if (ipCache.has(ip)) {
        const lastClaim = ipCache.get(ip);
        const diff = now - lastClaim;
        const cooldown = 24 * 60 * 60 * 1000; // 24 hours
        if (diff < cooldown) {
            const timeLeft = Math.ceil((cooldown - diff) / (60 * 60 * 1000));
            return res.status(429).json({ 
                success: false, 
                message: `Kamu sudah mengklaim hari ini. Coba lagi dalam ${timeLeft} jam.` 
            });
        }
    }

    const { service, target } = req.body;

    // Validation
    if (!service || !target) {
        return res.status(400).json({ success: false, message: 'Layanan dan target harus diisi!' });
    }

    let serviceId;
    let quantity;
    let serviceName = '';

    if (service === 'instagram') {
        serviceId = 6322; // Instagram Followers
        quantity = 100;
        serviceName = 'Instagram Followers';
    } else if (service === 'youtube') {
        serviceId = 6460; // YouTube Subscribers
        quantity = 50;
        serviceName = 'YouTube Subscribers';
    } else {
        return res.status(400).json({ success: false, message: 'Layanan tidak valid!' });
    }

    const apiId = process.env.MEDANPEDIA_API_ID || '26753';
    const apiKey = process.env.MEDANPEDIA_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ 
            success: false, 
            message: 'Konfigurasi server bermasalah (API Key belum di-set di Vercel).' 
        });
    }

    try {
        // Medanpedia SMM API expects application/x-www-form-urlencoded
        const params = new URLSearchParams();
        params.append('api_id', apiId);
        params.append('api_key', apiKey);
        params.append('service', serviceId.toString());
        params.append('target', target.trim());
        params.append('quantity', quantity.toString());

        const response = await fetch('https://api.medanpedia.co.id/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Medanpedia API HTTP Error:', errorText);
            return res.status(502).json({ 
                success: false, 
                message: 'Gagal menghubungi server SMM (Medanpedia HTTP Error).' 
            });
        }

        const data = await response.json();

        // Check response status from Medanpedia
        // Response format usually has success/status field
        if (data.status === true || data.success === true || (data.status && data.status !== 'error')) {
            // Success order, record IP
            ipCache.set(ip, now);
            return res.status(200).json({ 
                success: true, 
                message: `Sukses memesan ${quantity} ${serviceName} gratis ke target: ${target}. Proses sedang berjalan!` 
            });
        } else {
            console.error('Medanpedia API Error Response:', data);
            return res.status(400).json({ 
                success: false, 
                message: data.message || 'Gagal memproses pesanan di server Medanpedia.' 
            });
        }
    } catch (error) {
        console.error('Error handling freebie request:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan sistem internal.' 
        });
    }
}
