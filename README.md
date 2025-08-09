<img width="3188" height="1202" alt="frame (3)" src="https://github.com/user-attachments/assets/517ad8e9-ad22-457d-9538-a9e62d137cd7" />


# [Project Name] 🎯
Kurakkum Patti Kadikkilla 

## Basic Details
### Team Name: TEAM CUSAT  


### Team Members
- Team Lead: Ruvais P - SOE,CUSAT
- Member 2: Sajad Hussain - SOE,CUSAT

### Project Description
A security-obsessed Malayalam chatbot that blocks users from accessing HTTP (non-HTTPS) websites and scolds them with hilarious Malayalam dialogues. "കുരയ്ക്കും പട്ടി കടിക്കില്ല" — The overprotective digital dog that barks at insecure connections.

### The Problem (that doesn't exist)
People are carelessly browsing HTTP websites in 2025 without realizing the "danger" of unencrypted connections! Someone needs to be the internet police and lecture them about it.

### The Solution (that nobody asked for)
We created a Malayalam-speaking security guard that detects HTTP pages, blocks access with dramatic flair, and delivers entertaining security lectures in Malayalam with TTS audio because HTTPS enforcement should be fun!

## Technical Details
### Technologies/Components Used
For Software:
Languages: Python, JavaScript, HTML, CSS
Frameworks: FastAPI (Backend), Vanilla JS (Frontend)
Libraries: gTTS (Malayalam Text-to-Speech), uvicorn
Tools: Browser Extension/Userscript, URL Detection, Tampermonkey support

### Implementation

For Software:
# Installation
# Backend Setup
cd kurakkum-patti-kadikkilla/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Frontend Setup  
cd ..\frontend
python -m http.server 5173

# Run
# Start Backend
cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Access Frontend
# Open http://localhost:5173 in browser
# Health check: http://localhost:8000/health

### Project Documentation
For Software:

![Screenshot 2025-08-09 164736](https://github.com/user-attachments/assets/72c3ab07-2fb7-4e2c-bf4a-a2b9a7477627)
![Screenshot 2025-08-09 165103](https://github.com/user-attachments/assets/9aba4daa-958d-4c38-b6ff-756f49aa78de)
![Screenshot 2025-08-09 164938](https://github.com/user-attachments/assets/4af79d4e-d6f1-47bb-8dd3-2ac1d1059137)



# Diagrams
![Workflow]
<img width="2594" height="3848" alt="Untitled diagram _ Mermaid Chart-2025-08-09-113303" src="https://github.com/user-attachments/assets/ac0518b8-8091-414b-8cd3-602a7e8ec389" />

### Project Demo
# Video
https://youtu.be/Hky8yf065D4
---
Made with ❤️ at TinkerHub Useless Projects 

![Static Badge](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Static Badge](https://img.shields.io/badge/UselessProjects--25-25?link=https%3A%2F%2Fwww.tinkerhub.org%2Fevents%2FQ2Q1TQKX6Q%2FUseless%2520Projects)


