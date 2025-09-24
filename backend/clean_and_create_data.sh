#!/bin/bash

echo "Cleaning and creating realistic data..."

# Get the IDs of our target therapists
SARAH_ID=$(curl -s http://localhost:8083/api/therapists | jq -r '.[] | select(.name=="Dr. Sarah Chen" and .email=="sarah.chen@therapy.com") | .id')
MARCUS_ID=$(curl -s http://localhost:8083/api/therapists | jq -r '.[] | select(.name=="Dr. Marcus Thompson") | .id')

echo "Found therapists:"
echo "Dr. Sarah Chen ID: $SARAH_ID"
echo "Dr. Marcus Thompson ID: $MARCUS_ID"

# Create 4 patients using simpler data (the API might have stricter validation)
echo "Creating patients..."

curl -X POST http://localhost:8083/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jessica Miller",
    "email": "jessica.miller@email.com",
    "age": 31,
    "presenting_concerns": "Work stress, anxiety attacks"
  }'

curl -X POST http://localhost:8083/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Santos", 
    "email": "maria.santos@email.com",
    "age": 28,
    "presenting_concerns": "Social anxiety, perfectionism"
  }'

curl -X POST http://localhost:8083/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alex Kim",
    "email": "alex.kim@email.com", 
    "age": 33,
    "presenting_concerns": "PTSD, nightmares"
  }'

curl -X POST http://localhost:8083/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "David Park",
    "email": "david.park@email.com",
    "age": 35, 
    "presenting_concerns": "Depression, isolation"
  }'

echo ""
echo "✅ Data setup complete!"
echo "Now we have 2 therapists with 4 new patients ready for sessions!"