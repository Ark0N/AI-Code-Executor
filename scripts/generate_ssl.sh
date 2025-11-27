#!/bin/bash

echo "================================================"
echo "Generate Self-Signed SSL Certificate"
echo "================================================"

cd "$(dirname "$0")"

# Create certs directory
mkdir -p certs

# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -nodes \
  -out certs/cert.pem \
  -keyout certs/key.pem \
  -days 365 \
  -subj "/C=CH/ST=Basel/L=Basel/O=LocalDev/CN=localhost"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Certificate generated successfully!"
    echo ""
    echo "Files created:"
    echo "  - certs/cert.pem"
    echo "  - certs/key.pem"
    echo ""
    echo "⚠️  Browser will show security warning (self-signed cert)"
    echo "   Click 'Advanced' → 'Proceed to localhost'"
    echo ""
    echo "To use HTTPS, update start.sh:"
    echo "  uvicorn backend.main:app --host 0.0.0.0 --port 8000 \\"
    echo "    --ssl-keyfile=certs/key.pem \\"
    echo "    --ssl-certfile=certs/cert.pem"
else
    echo "❌ Failed to generate certificate"
    exit 1
fi
