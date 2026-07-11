#!/bin/bash
# Script para iniciar túneis ngrok para o Encrypthor
# Uso: bash start-ngrok.sh

# Criar config temporária do ngrok
CONFIG_FILE="/tmp/ngrok-encripthor.yml"

cat > "$CONFIG_FILE" << 'EOF'
version: "3"
agent:
  authtoken: 2kpgJJHutIpv9Cemois27kBcF6s_pDPEqigebFm2s9yNVktw
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
echo "  - Web:     https://XXXX.ngrok.io (porta 3000)"
echo "  - Socket:  https://YYYY.ngrok.io (porta 3001)"
echo ""
echo "=== MÉTODO RÁPIDO (recomendado) ==="
echo "1. Abra o navegador no link web (https://XXXX.ngrok.io)"
echo "2. Abra o console (F12) e digite:"
echo "     localStorage.setItem('socketUrl', 'https://YYYY.ngrok.io')"
echo "3. Recarregue a página (F5)"
echo "✅ Pronto! Sem rebuild do Docker."
echo ""
echo "=== MÉTODO TRADICIONAL ==="
echo "1. Edite docker-compose.yml e adicione:"
echo "     NEXT_PUBLIC_SOCKET_URL: https://YYYY.ngrok.io"
echo "2. Reconstrua: docker compose build && docker compose up -d"
echo ""
echo "Pressione Ctrl+C para parar os túneis"
echo "==================================="
echo ""

ngrok start --config "$CONFIG_FILE" --all
