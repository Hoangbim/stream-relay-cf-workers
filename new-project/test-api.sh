#!/bin/bash

# API Testing Commands for Cloudflare Worker Project
# ------------------------------------------------
BASE_URL="http://localhost:8787/api"
TOKEN=""

# Color formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}==== Cloudflare Worker API Test Script ====${NC}\n"

# Check if json_pp is available
if ! command -v json_pp &> /dev/null; then
    echo -e "${RED}json_pp not found, installing jq for JSON formatting${NC}"
    # Try to install jq if json_pp isn't available
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y jq
        alias json_pp='jq .'
    elif command -v brew &> /dev/null; then
        brew install jq
        alias json_pp='jq .'
    else
        echo -e "${RED}Cannot install JSON formatter. Will display raw output.${NC}"
        alias json_pp='cat'
    fi
fi

# Check if the worker is running
echo -e "${GREEN}Checking if the worker is running...${NC}"
health_check=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" || echo "failed")
if [[ "$health_check" != "200" ]]; then
    echo -e "${RED}API server doesn't appear to be running. Start it with 'npx wrangler dev' first.${NC}"
    echo -e "${BLUE}Attempting to start the worker...${NC}"
    cd "$(dirname "$0")" && npx wrangler dev --local &
    WORKER_PID=$!
    # Wait for worker to start
    echo -e "${BLUE}Waiting for worker to start...${NC}"
    sleep 5
fi

# 1. User Registration
echo -e "${GREEN}Testing User Registration${NC}"
echo "POST $BASE_URL/auth/register"
register_response=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser1", "password":"password123"}')
echo "$register_response" | json_pp
echo ""

# 2. User Login and Token Retrieval
echo -e "${GREEN}Testing User Login${NC}"
echo "POST $BASE_URL/auth/login"
login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser1", "password":"password123"}')
echo "$login_response" | json_pp
echo ""

# Extract token from response
# First try to parse it as a proper JWT token
TOKEN=$(echo "$login_response" | grep -o '"token":"[^"]*' | sed 's/"token":"//;s/".*//' || echo "")

# If no token found, try alternative formats or use dummy token
if [ -z "$TOKEN" ]; then
    echo -e "${RED}No token found in response. Using dummy token for testing${NC}"
    TOKEN="dummy-token-for-testing"
else
    echo -e "${GREEN}✓ Token retrieved successfully${NC}"
fi
echo -e "${BLUE}Using token: ${TOKEN}${NC}\n"

# 3. Create a Game Table (authenticated)
echo -e "${GREEN}Creating a Game Table${NC}"
echo "POST $BASE_URL/tables"
table_response=$(curl -s -X POST "$BASE_URL/tables" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tableName":"Test Poker Table"}')
echo "$table_response" | json_pp
echo ""

# Extract table ID for subsequent requests
TABLE_ID=$(echo "$table_response" | grep -o '"id":"[^"]*' | sed 's/"id":"//;s/".*//' | head -1)

# Fallback to a fixed value if no table ID was found
if [ -z "$TABLE_ID" ]; then
  echo -e "${RED}⚠️ Failed to retrieve table ID, using dummy value${NC}"
  TABLE_ID="dummy-table-id"
else
  echo -e "${GREEN}✓ Table ID retrieved successfully: ${TABLE_ID}${NC}"
fi
echo ""

# 4. Get All Tables
echo -e "${GREEN}Getting All Game Tables${NC}"
echo "GET $BASE_URL/tables"
all_tables_response=$(curl -s -X GET "$BASE_URL/tables")
echo "$all_tables_response" | json_pp
echo ""

# Check if the response is valid
if [[ "$all_tables_response" == *"error"* ]]; then
  echo -e "${RED}⚠️ Error getting tables${NC}"
else
  echo -e "${GREEN}✓ Tables retrieved successfully${NC}"
fi

# 5. Get Specific Table by ID
echo -e "${GREEN}Getting Specific Table${NC}"
echo "GET $BASE_URL/tables/$TABLE_ID"
table_details=$(curl -s -X GET "$BASE_URL/tables/$TABLE_ID")
echo "$table_details" | json_pp
echo ""

# 6. Join Another Player to Table
echo -e "${GREEN}Testing User Registration for second user${NC}"
echo "POST $BASE_URL/auth/register"
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser2", "password":"password123"}' | json_pp
echo ""

echo -e "${GREEN}Adding Player to Table${NC}"
echo "POST $BASE_URL/tables/$TABLE_ID/players/testuser2"
player_add_response=$(curl -s -X POST "$BASE_URL/tables/$TABLE_ID/players/testuser2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")
echo "$player_add_response" | json_pp
echo ""

# 7. Get Player Information
echo -e "${GREEN}Getting Player Information${NC}"
echo "GET $BASE_URL/tables/$TABLE_ID/players/testuser1"
player_info=$(curl -s -X GET "$BASE_URL/tables/$TABLE_ID/players/testuser1" \
  -H "Authorization: Bearer $TOKEN")
echo "$player_info" | json_pp
echo ""

# 8. Transfer Points Between Players
echo -e "${GREEN}Transferring Points Between Players${NC}"
echo "POST $BASE_URL/tables/$TABLE_ID/players/testuser1/transfer"
transfer_response=$(curl -s -X POST "$BASE_URL/tables/$TABLE_ID/players/testuser1/transfer" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"toPlayerId":"testuser2", "amount":100}')
echo "$transfer_response" | json_pp
echo ""

# 9. Get Transfer History
echo -e "${GREEN}Getting Transfer History${NC}"
echo "GET $BASE_URL/tables/$TABLE_ID/history"
history_response=$(curl -s -X GET "$BASE_URL/tables/$TABLE_ID/history" \
  -H "Authorization: Bearer $TOKEN")
echo "$history_response" | json_pp
echo ""

# 10. Create an Item (authenticated)
echo -e "${GREEN}Creating an Item${NC}"
echo "POST $BASE_URL/items"
item_response=$(curl -s -X POST "$BASE_URL/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test Item", "description":"A test item created via API", "value":50}')
echo "$item_response" | json_pp
echo ""

# 11. Get All Items (authenticated)
echo -e "${GREEN}Getting All Items${NC}"
echo "GET $BASE_URL/items"
items_response=$(curl -s -X GET "$BASE_URL/items" \
  -H "Authorization: Bearer $TOKEN")
echo "$items_response" | json_pp
echo ""

# Check API documentation
echo -e "${GREEN}Checking API Documentation${NC}"
echo "GET $BASE_URL/docs"
curl -s -X GET "$BASE_URL/docs" | head -20 | json_pp
echo "..."

# End of script
echo -e "\n${BLUE}==== API Tests Completed ====${NC}"

# If we started the worker, shut it down
if [ ! -z "$WORKER_PID" ]; then
    echo -e "${BLUE}Shutting down worker (PID: $WORKER_PID)${NC}"
    kill $WORKER_PID
fi
