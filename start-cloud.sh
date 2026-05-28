#!/bin/sh
# SATELINK PAPERCLIP — CLOUD STARTUP
# Railway injects DATABASE_URL automatically
echo "Starting Paperclip on Railway..."
echo "DATABASE_URL set: $(echo $DATABASE_URL | sed 's/:\/\/.*@/:\/\/***@/')"
paperclipai run
