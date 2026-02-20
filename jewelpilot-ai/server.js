import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ override: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

const apiKey = process.env.OPENAI_API_KEY;
const modelByTier = {
  fast: process.env.OPENAI_MODEL_FAST || process.env.OPENAI_MODEL || 'gpt-4o-mini',
  balanced: process.env.OPENAI_MODEL_BALANCED || process.env.OPENAI_MODEL || 'gpt-4o-mini',
  quality: process.env.OPENAI_MODEL_QUALITY || process.env.OPENAI_MODEL || 'gpt-4o'
};
const client = apiKey ? new OpenAI({ apiKey }) : null;

function basePrompt(settings = {}) {
  const tone = settings?.tone || 'high-converting';
  const audience = settings?.audience || 'US buyers';
  const voice = settings?.voice ? `\nBrand voice notes: ${settings.voice}` : '';

  return `You are a jewelry ecommerce copy expert.
Write concise, ${tone} copy for ${audience}.
Avoid fake claims. No trademark infringement. No medical claims.
If certifications are unknown, say "if certified" instead of fabricating.${voice}`;
}

function formatAmazonStructured(s = {}) {
  const titles = Array.isArray(s.titleVariations) ? s.titleVariations : [];
  const lengths = Array.isArray(s.titleLengthCheck) ? s.titleLengthCheck : [];
  const seo = Array.isArray(s.seoScore) ? s.seoScore : [];
  const bullets = Array.isArray(s.bulletPoints) ? s.bulletPoints : [];
  const keywords = Array.isArray(s.backendKeywords) ? s.backendKeywords : [];

  return [
    'A) Title Variations (A/B/C)',
    ...titles.map((t, i) => `- ${String.fromCharCode(65 + i)}) ${t}`),
    '',
    'B) Best Title Pick',
    `- ${s.bestTitlePick || ''}`,
    `- Why: ${s.bestTitleWhy || ''}`,
    '',
    'C) Title Length Check',
    ...lengths.map((x) => `- ${x.variant || ''}) ${x.characters || 0} characters - ${x.status || ''}`),
    '',
    'D) SEO Score',
    ...seo.map((x) => `- ${x.variant || ''}) ${x.score || 0} - ${x.reason || ''}`),
    '',
    'E) Policy Safety Check',
    `- ${s.policySafetyCheck || ''}`,
    '',
    'F) 5 Bullet Points',
    ...bullets.map((b) => `- ${b}`),
    '',
    'G) Backend Keyword List',
    `- ${keywords.join(', ')}`
  ].join('\n');
}

function formatShopifyStructured(s = {}) {
  const features = Array.isArray(s.features) ? s.features : [];
  const tags = Array.isArray(s.tags) ? s.tags : [];
  return [
    `Shopify Title: ${s.title || ''}`,
    '',
    'Description:',
    s.description || '',
    '',
    'HTML Description:',
    s.htmlDescription || '',
    '',
    'Key Features:',
    ...features.map((f) => `- ${f}`),
    '',
    `SEO Title: ${s.seoTitle || ''}`,
    `Meta Description: ${s.metaDescription || ''}`,
    `Tags: ${tags.join(', ')}`,
    `Handle: ${s.handle || ''}`
  ].join('\n');
}

app.post('/api/generate', async (req, res) => {
  try {
    const { type, product, modelTier, settings, variants } = req.body || {};
    if (!type || !product) {
      return res.status(400).json({ error: 'Missing type or product.' });
    }

    const tier = String(modelTier || 'balanced').toLowerCase();
    const selectedModel = modelByTier[tier] || modelByTier.balanced;

    const promptByType = {
      etsy: `Create Etsy content:\n1) SEO title (max 140 chars)\n2) 13 tags\n3) Product description with bullets\n\nProduct:\n${JSON.stringify(product, null, 2)}`,
      amazon: `Create Amazon listing content for US marketplace.
Return ONLY valid JSON with this exact shape:
{
  "titleVariations": ["", "", ""],
  "bestTitlePick": "",
  "bestTitleWhy": "",
  "titleLengthCheck": [{"variant":"A","characters":0,"status":"OK"}],
  "seoScore": [{"variant":"A","score":0,"reason":""}],
  "policySafetyCheck": "",
  "bulletPoints": ["", "", "", "", ""],
  "backendKeywords": ["", "", "..."]
}
Rules:
- titleVariations must be exactly 3 items, each <=180 chars.
- bulletPoints must be exactly 5 items.
- backendKeywords must be 15-25 short non-repetitive search terms.

Product:
${JSON.stringify(product, null, 2)}`,
      shopify: `Create Shopify product page copy.
Return ONLY valid JSON with this exact shape:
{
  "title": "",
  "description": "",
  "htmlDescription": "",
  "features": ["", "", "", "", ""],
  "seoTitle": "",
  "metaDescription": "",
  "tags": ["", "", ""],
  "handle": ""
}
Rules:
- title: <= 140 chars.
- description: 1-2 short paragraphs, conversion-focused.
- htmlDescription: valid Shopify-safe HTML using <p>, <ul>, <li>, <strong> only.
- features: exactly 5 bullets.
- seoTitle: <= 70 chars.
- metaDescription: <= 160 chars.
- tags: 8-15 relevant tags.
- handle: lowercase-hyphen URL slug only.

Product:
${JSON.stringify(product, null, 2)}`,
      ads: `Create Meta ads copy:\n- 5 primary texts\n- 5 headlines\n- 3 CTAs\n\nProduct:\n${JSON.stringify(product, null, 2)}`,
      followup: `Create buyer follow-up messages:\n- Day 0 first response\n- Day 1 follow-up\n- Day 3 follow-up\nKeep it natural for WhatsApp/Instagram.\n\nProduct:\n${JSON.stringify(product, null, 2)}`,
      amazon_title: `Generate 10 high-converting Amazon title options (each <=180 chars), then pick the best 3.\nReturn only:\n- Top 1\n- Top 2\n- Top 3\n- Character count for each\n\nProduct:\n${JSON.stringify(product, null, 2)}`
    };

    let userPrompt = promptByType[type];
    if (!userPrompt) return res.status(400).json({ error: 'Unsupported type.' });

    const variantCount = Number(variants || 0);
    if (variantCount >= 2 && !['amazon', 'shopify'].includes(type)) {
      userPrompt += `\n\nAlso produce ${variantCount} clearly labeled variants (Variant 1..${variantCount}) with different angles.`;
    }

    if (!client) {
      return res.json({
        content: `[Demo mode] Add OPENAI_API_KEY in .env to enable live generation.\n\nRequested: ${type}\nModel tier: ${tier} (${selectedModel})\nProduct: ${product.name || 'Unnamed product'}`
      });
    }

    const isStructuredAmazon = type === 'amazon';
    const isStructuredShopify = type === 'shopify';
    const response = await client.chat.completions.create({
      model: selectedModel,
      temperature: 0.7,
      response_format: (isStructuredAmazon || isStructuredShopify) ? { type: 'json_object' } : undefined,
      messages: [
        { role: 'system', content: basePrompt(settings) },
        { role: 'user', content: userPrompt }
      ]
    });

    const rawContent = response.choices?.[0]?.message?.content || '';

    if (isStructuredAmazon) {
      try {
        const parsed = JSON.parse(rawContent);
        const content = formatAmazonStructured(parsed);

        const titleVariations = Array.isArray(parsed.titleVariations) ? parsed.titleVariations : [];
        let cleanTitle = String(parsed.bestTitlePick || '').trim();

        const letterOnly = cleanTitle.match(/^([A-C])\)?$/i);
        if (letterOnly) {
          const idx = letterOnly[1].toUpperCase().charCodeAt(0) - 65;
          cleanTitle = titleVariations[idx] || '';
        } else {
          const noisyBest = cleanTitle.match(/^([A-C])\)\s*(.+)$/i);
          if (noisyBest?.[2]) cleanTitle = noisyBest[2];
        }

        if (!cleanTitle) cleanTitle = titleVariations[0] || '';

        const bulletPoints = (Array.isArray(parsed.bulletPoints) ? parsed.bulletPoints : [])
          .map((b) => String(b || '').trim())
          .filter(Boolean)
          .slice(0, 5);

        const backendKeywords = (Array.isArray(parsed.backendKeywords) ? parsed.backendKeywords : [])
          .map((k) => String(k || '').trim())
          .filter(Boolean);

        const keywordCsv = backendKeywords.join(', ');

        return res.json({
          content,
          amazonSections: {
            title: cleanTitle,
            bullets: bulletPoints.join('\n'),
            keywords: keywordCsv,
            backend: keywordCsv
          }
        });
      } catch {
        // Fallback to plain text if JSON parsing fails
      }
    }

    if (isStructuredShopify) {
      try {
        const parsed = JSON.parse(rawContent);
        const content = formatShopifyStructured(parsed);

        const features = (Array.isArray(parsed.features) ? parsed.features : [])
          .map((f) => String(f || '').trim())
          .filter(Boolean)
          .slice(0, 5);

        const tags = (Array.isArray(parsed.tags) ? parsed.tags : [])
          .map((t) => String(t || '').trim())
          .filter(Boolean);

        const seo = [
          parsed.seoTitle ? `SEO Title: ${String(parsed.seoTitle).trim()}` : '',
          parsed.metaDescription ? `Meta Description: ${String(parsed.metaDescription).trim()}` : ''
        ].filter(Boolean).join('\n');

        const htmlDescription = String(parsed.htmlDescription || '').trim();

        return res.json({
          content,
          shopifySections: {
            title: String(parsed.title || '').trim(),
            description: [String(parsed.description || '').trim(), ...features.map((f) => `• ${f}`)].filter(Boolean).join('\n'),
            html: htmlDescription,
            seo,
            tags: tags.join(', '),
            handle: String(parsed.handle || '').trim()
          }
        });
      } catch {
        // Fallback to plain text if JSON parsing fails
      }
    }

    const content = rawContent || 'No output generated.';
    res.json({ content });
  } catch (err) {
    console.error('Generate error:', err?.message || err);
    const detail = err?.message || 'Unknown error';
    res.status(500).json({ error: `Generation failed: ${detail}` });
  }
});

app.get('/health', (_, res) => res.json({ ok: true }));

const port = process.env.PORT || 4300;
app.listen(port, () => {
  console.log(`LustrePilot AI running on http://localhost:${port}`);
});
