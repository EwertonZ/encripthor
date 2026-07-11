#!/bin/bash
# Script para iniciar túneis ngrok para o Encrypthor
# Uso: bash start-ngrok.sh

# Criar config temporária do ngrok
CONFIG_FILE="/tmp/ngrok-encripthor.yml"

cat > "$CONFIG_FILE" << 'EOF'
version: "2"
tunnels:
  web:
    proto: http
    addr: 3000
  socketio:
    proto: http
    addr: 3001
EOF

echo "==================================="
echo "  🚀 Iniciando túneis ngrok..."
echo "==================================="
echo ""
echo "Após iniciar, você verá duas URLs:"
echo "  - Web:  https://XXXX.ngrok.io (porta 3000)"
echo "  - Socket: https://YYYY.ngrok.io (porta 3001)"
echo ""
echo "Para configurar o Socket.IO:"
echo "  1. Copie a URL do socket (ex: https://yyyy.ngrok.io)"
echo "  2. Edite docker-compose.yml e adicione:"
echo "       NEXT_PUBLIC_SOCKET_URL: https://yyyy.ngrok.io"
echo "  3. Reconstrua: docker compose build && docker compose up -d"
echo ""
echo "Pressione Ctrl+C para parar os túneis"
echo "==================================="
echo ""

ngrok start --config "$CONFIG_FILE" --all
