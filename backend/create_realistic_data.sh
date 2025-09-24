#!/bin/bash

echo "Creating realistic data: 2 therapists with 2 patients each..."

# Create Dr. Sarah Chen (Anxiety & Depression specialist)
curl -X POST http://localhost:8083/api/therapists \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Sarah Chen",
    "specialty": "Anxiety & Depression",
    "email": "sarah.chen@therapy.com",
    "phone": "555-0101",
    "license_number": "LIC123456",
    "years_experience": 8,
    "bio": "Specializes in CBT and mindfulness-based approaches for anxiety and depression."
  }'

# Create Dr. Marcus Thompson (Trauma & PTSD specialist)  
curl -X POST http://localhost:8083/api/therapists \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Marcus Thompson", 
    "specialty": "Trauma & PTSD",
    "email": "marcus.thompson@therapy.com",
    "phone": "555-0102",
    "license_number": "LIC234567",
    "years_experience": 12,
    "bio": "Expert in trauma-informed care and EMDR therapy for PTSD recovery."
  }'

# Create Dr. Sarah Chen's patients
curl -X POST http://localhost:8083/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jessica Miller",
    "email": "jessica.miller@email.com", 
    "phone": "555-0201",
    "date_of_birth": "1992-03-15",
    "age": 31,
    "background_info": "Software engineer experiencing work-related stress and anxiety",
    "presenting_concerns": "Work stress, sleep issues, anxiety attacks"
  }'

curl -X POST http://localhost:8083/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Santos",
    "email": "maria.santos@email.com",
    "phone": "555-0203",
    "date_of_birth": "1995-11-08", 
    "age": 28,
    "background_info": "Graduate student with perfectionism and social anxiety",
    "presenting_concerns": "Social anxiety, perfectionism, academic pressure"
  }'

# Create Dr. Marcus Thompson's patients
curl -X POST http://localhost:8083/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alex Kim",
    "email": "alex.kim@email.com",
    "phone": "555-0204",
    "date_of_birth": "1990-05-18", 
    "age": 33,
    "background_info": "Military veteran dealing with PTSD and adjustment issues",
    "presenting_concerns": "PTSD, nightmares, anger management"
  }'

curl -X POST http://localhost:8083/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "David Park",
    "email": "david.park@email.com",
    "phone": "555-0202", 
    "date_of_birth": "1988-07-22",
    "age": 35,
    "background_info": "Recent divorce, struggling with depression and isolation",
    "presenting_concerns": "Depression, loneliness, major life transition"
  }'

echo ""
echo "✅ Realistic data created!"
echo "- 2 Therapists: Dr. Sarah Chen (Anxiety) & Dr. Marcus Thompson (Trauma)"
echo "- 4 Patients: 2 for each therapist"
echo ""
echo "You can now create sessions between therapists and their patients in the UI!"