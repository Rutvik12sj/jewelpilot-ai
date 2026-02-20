# LustrePilot AI — QA Smoke Test

## Test Product (sample)
- Product: Lab Grown Diamond Eternity Ring
- Metal: Sterling Silver
- Stone: CVD Lab Grown Diamond
- Price: $125
- Notes: Luxury minimalist anniversary ring for women, gift-ready packaging.

## Core Flow
- [ ] Open app at localhost:4301
- [ ] Fill product fields
- [ ] Generate Amazon
- [ ] Confirm final title in main output
- [ ] Confirm Amazon tabs populate (Title/Bullets/Keywords/Backend)
- [ ] Run validator and verify checks display
- [ ] Click Fix Issues and re-check validator
- [ ] Generate Shopify
- [ ] Confirm Shopify tabs populate (Title/Description/HTML/SEO/Tags/Handle)
- [ ] Copy Shopify Product Pack and validate JSON shape
- [ ] Export TXT / CSV / Bundle
- [ ] Save project with performance values
- [ ] Load project and verify fields restore

## Mobile/Responsive
- [ ] Narrow viewport to mobile width
- [ ] Confirm sticky action bar shows
- [ ] Confirm buttons are tappable
- [ ] Confirm compact mode toggle works

## Pass Condition
- [ ] All sections above pass without blocking errors
