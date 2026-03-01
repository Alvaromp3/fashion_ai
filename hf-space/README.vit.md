---
title: Fashion AI ML (ViT only)
emoji: 👗
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# Fashion AI — ViT classification only

Vision Transformer model for garment classification. Used when the main Space (CNN) is separate; backend calls this for `/classify-vit`.

## API

- **GET /health** — Model status
- **POST /classify-vit** — ViT classification (form field `imagen`: image file)

Set your backend **ML_VIT_SERVICE_URL** to this Space's URL.
