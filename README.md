# Smart Exam Evaluator

## Project Overview

Smart Exam Evaluator is an AI-powered academic system designed to automate and enhance the traditional exam evaluation process. It helps faculty efficiently evaluate answer scripts, generate question papers, and analyze student performance with actionable insights.


## Problem Statement

Manual exam evaluation is time-consuming, inconsistent, and difficult to scale for large classes. Faculty often spend hours on repetitive correction work, leading to delayed feedback and reduced teaching efficiency.

### Key Challenges:

* High correction workload during exams
* Delay in student feedback
* Inconsistent evaluation standards
* Lack of performance analytics
* Difficulty in identifying weak topics



## 💡 Solution Overview

Smart Exam Evaluator digitizes and automates the complete evaluation workflow:

* Faculty creates exam details (class, roll range, marks distribution)
* Uploads question paper and reference answers
* Student answer sheets are uploaded or marked absent
* AI evaluates answers and generates:

  * Question-wise marks
  * Total score
  * Strengths and weak areas
  * Improvement suggestions
* Dashboard provides performance analytics
* Question papers can be generated from syllabus and exported as PDF



##  Key Features

*  Secure Login Authentication (JWT-based)
*  Exam Creation & Management
*  Answer Sheet Upload & Absentee Handling
*  AI-based Evaluation using reference answers
*  Performance Analytics Dashboard
*  Question Paper Generation (PDF download)
*  Class-level and Student-level insights


##  Technology Stack

### Frontend:

* React (Vite)
* React Router
* Axios
* Tailwind CSS
* Recharts
* jsPDF

### Backend:

* Node.js
* Express.js
* PostgreSQL
* JWT Authentication
* Multer (file uploads)
* Google Gemini API



##  Folder Structure


smart-exam-evaluator/
│
├── frontend/
├── backend/
├── README.md
├── .gitignore
└── docs/ (optional)
```



##  Setup Instructions

###  Prerequisites

* Node.js installed
* PostgreSQL installed
* Git installed
* Google Gemini API Key



###  Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
JWT_SECRET=your_secret
GEMINI_API_KEY=your_api_key
PORT=5000
```

Run backend:

```bash
node server.js
```

---

### 🔹 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```



### 🔹 Default URLs

* Frontend: http://localhost:5173
* Backend: http://localhost:5000



##  Usage Flow

1. Faculty logs into the system
2. Creates an exam with marks distribution
3. Uploads question paper and reference answers
4. Uploads student answer sheets
5. AI evaluates and assigns marks
6. Faculty views analytics dashboard
7. Generates question papers if required

---

##  Implementation Details

The system is built as a modular full-stack application:

* **Auth Module**: Handles login using JWT
* **Exam Module**: Manages exam creation and structure
* **Upload Module**: Handles student answer uploads
* **Evaluation Module**: AI-based answer comparison
* **Analysis Module**: Generates insights and reports
* **Question Paper Module**: Auto-generates papers from syllabus



##  Scalability

* API-based architecture supports horizontal scaling
* PostgreSQL enables efficient data handling
* Can integrate cloud storage (AWS S3 / GCP)
* Supports asynchronous processing for large evaluations
* Frontend can be deployed via CDN



##  Feasibility

* Uses industry-standard technologies
* Easy to deploy with minimal infrastructure
* Simple UI for faculty usage
* Can be implemented incrementally in institutions



##  Impact

### Academic Impact:

* Faster student feedback
* Reduced faculty workload
* Improved evaluation consistency
* Better weak-topic identification

### Institutional Impact:

* Streamlined exam processes
* Data-driven academic decisions
* Supports accreditation and reporting
* Potential SaaS scalability


##  Performance

* Fast UI and responsive dashboards
* Automated evaluation reduces correction time
* Marks validation ensures accuracy
* AI fallback mechanisms improve reliability



##  Future Scope

* Human-in-the-loop evaluation with confidence scores
* OCR for handwritten answer sheets
* Plagiarism detection
* CO/PO-based analytics
* Multi-language evaluation
* ERP/LMS integration
* Mobile application
* Personalized student improvement plans



##  Point of Contact

**Name:** Tankala Sai Sanjana
**Email:** sanjutankala2005@gmail.com
**GitHub:** https://github.com/SanjanaTankala
**College:** Gayatri vidya parishad college of engineering ,Vishakapatnam

---

##  License

This project is licensed under the MIT License.
