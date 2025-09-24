#!/bin/bash

# DNS and SSL Certificate Monitor
# Runs until tns.acadia.sh is ready with SSL

RED='\033[41m'     # Red background
GREEN='\033[42m'   # Green background
BLUE='\033[44m'    # Blue background
YELLOW='\033[43m'  # Yellow background
MAGENTA='\033[45m' # Magenta background
CYAN='\033[46m'    # Cyan background
WHITE='\033[47m'   # White background
NC='\033[0m'       # No Color

echo "🔍 Monitoring DNS and SSL for tns.acadia.sh..."
echo "Will flash crazy colors when ready! 🌈"
echo ""

while true; do
  # Clear screen
  clear

  # Check DNS
  DNS_RESULT=$(nslookup tns.acadia.sh 2>/dev/null | grep "ghs.googlehosted.com" || echo "OLD_DNS")

  if [[ "$DNS_RESULT" == "OLD_DNS" ]]; then
    echo "⏳ DNS: Still pointing to old Cloud Run URL"
    DNS_STATUS="❌"
  else
    echo "✅ DNS: Points to ghs.googlehosted.com"
    DNS_STATUS="✅"
  fi

  # Check SSL certificate status
  SSL_STATUS=$(gcloud beta run domain-mappings describe --domain=tns.acadia.sh --region=us-central1 --format="value(status.conditions[0].status)" 2>/dev/null || echo "Unknown")

  echo "🔐 SSL Status: $SSL_STATUS"

  # Check if we can access the site
  HTTPS_TEST=$(curl -s -o /dev/null -w "%{http_code}" https://tns.acadia.sh 2>/dev/null || echo "000")

  echo "🌐 HTTPS Test: $HTTPS_TEST"
  echo ""
  echo "Current time: $(date)"

  # If everything is ready, PARTY TIME! 🎉
  if [[ "$SSL_STATUS" == "True" ]] && [[ "$HTTPS_TEST" == "200" ]]; then
    echo ""
    echo "🎉🎉🎉 SUCCESS! tns.acadia.sh is ready! 🎉🎉🎉"

    # CRAZY COLORS CELEBRATION!
    for i in {1..20}; do
      printf "${RED}████${GREEN}████${BLUE}████${YELLOW}████${MAGENTA}████${CYAN}████${WHITE}████${NC}\n"
      printf "${CYAN}████${WHITE}████${RED}████${GREEN}████${BLUE}████${YELLOW}████${MAGENTA}████${NC}\n"
      printf "${YELLOW}████${MAGENTA}████${CYAN}████${WHITE}████${RED}████${GREEN}████${BLUE}████${NC}\n"
      printf "${GREEN}████${BLUE}████${YELLOW}████${MAGENTA}████${CYAN}████${WHITE}████${RED}████${NC}\n"
      printf "${BLUE}████${YELLOW}████${MAGENTA}████${CYAN}████${WHITE}████${RED}████${GREEN}████${NC}\n"
      printf "${MAGENTA}████${CYAN}████${WHITE}████${RED}████${GREEN}████${BLUE}████${YELLOW}████${NC}\n"
      sleep 0.1
    done

    echo ""
    echo "🚀 Ready to test at: https://tns.acadia.sh"
    echo "💻 Press Ctrl+C to exit"

    # Keep flashing until user stops
    while true; do
      printf "${GREEN}🎉 READY! 🎉${NC} "
      sleep 0.5
      printf "${RED}🚀 TEST NOW! 🚀${NC} "
      sleep 0.5
    done

    break
  fi

  # Wait 1 minute before checking again
  echo "⏰ Checking again in 60 seconds..."
  sleep 60
done