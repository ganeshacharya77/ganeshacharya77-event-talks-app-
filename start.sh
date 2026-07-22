#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    ./venv/bin/pip install -r requirements.txt
fi

echo "🚀 Starting BigQuery Release Notes Web App..."
echo "🌐 Open your browser at: http://127.0.0.1:5050"
./venv/bin/python3 app.py
