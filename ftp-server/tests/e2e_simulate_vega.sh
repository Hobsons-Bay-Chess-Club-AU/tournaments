#!/usr/bin/env bash
set -e

PORT=${1:-2121}
HTTP_PORT=${2:-8080}
HOST="127.0.0.1"

echo "=== HBCC Vega FTP Server Simulation ==="
echo "Target FTP Server: ftp://$HOST:$PORT"
echo "Target HTTP Preview: http://$HOST:$HTTP_PORT"

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

SAMPLE_FILE="$TMP_DIR/pairings.html"
cat << 'EOF' > "$SAMPLE_FILE"
<!DOCTYPE html>
<html>
<head><title>HBCC Vega Pairings - Round 1</title></head>
<body style="font-family: sans-serif; padding: 2rem;">
  <h1>Hobsons Bay Chess Club - Summer Cup 2026</h1>
  <h2>Round 1 Pairings</h2>
  <table border="1" cellpadding="8" style="border-collapse: collapse;">
    <tr><th>Bd</th><th>White</th><th>Res</th><th>Black</th></tr>
    <tr><td>1</td><td>Carlsen, M</td><td>vs</td><td>Nakamura, H</td></tr>
    <tr><td>2</td><td>Caruana, F</td><td>vs</td><td>Ding, L</td></tr>
  </table>
</body>
</html>
EOF

echo "1. Uploading test tournament file via FTP..."
curl -s -T "$SAMPLE_FILE" "ftp://$HOST:$PORT/summer_cup/pairings.html" --user vega:vega --ftp-create-dirs

echo "✓ Upload succeeded!"

echo "2. Verifying HTTP preview..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$HOST:$HTTP_PORT/summer_cup/pairings.html")
if [ "$HTTP_STATUS" -eq 200 ]; then
  echo "✓ HTTP preview verified: http://$HOST:$HTTP_PORT/summer_cup/pairings.html (HTTP 200)"
else
  echo "✗ HTTP preview failed with status $HTTP_STATUS"
  exit 1
fi

echo "=== All simulations passed successfully! ==="
