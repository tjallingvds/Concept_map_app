# Concept Map App

A powerful application for creating, sharing, and collaborating on concept maps to enhance learning and knowledge organization.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
- [Tasks and Project Management](#tasks-and-project-management)
- [Contributing](#contributing)
  - [Development Workflow](#development-workflow)
  - [Code Style and Standards](#code-style-and-standards)
  - [Pull Request Process](#pull-request-process)
  - [Commit Message Guidelines](#commit-message-guidelines)
  - [Issue Tracking](#issue-tracking)
- [Contact](#contact)

## 🌟 Overview

Concept Map App is a web-based tool designed to help users create visual representations of knowledge and relationships between concepts. It's particularly useful for students, educators, researchers, and anyone looking to organize complex information in an intuitive way.

## ✨ Features

- **Interactive Concept Map Creation**: Drag-and-drop interface for creating nodes and connections
- **User Accounts**: Personal dashboard to manage your concept maps
- **Sharing and Collaboration**: Share your maps publicly or collaborate with specific users
- **Notes & Learn**: Create and manage study notes with rich text editing
- **Convert Notes to Concept Maps**: Automatically transform your notes into structured concept maps
- **Templates and Examples**: Get started quickly with pre-built templates
- **Responsive Design**: Works on desktop and mobile devices
- **Export Options**: Save your maps in various formats (PNG, PDF, JSON)
- **Search Functionality**: Find public concept maps on topics of interest

## 🏗️ Architecture

The application follows a client-server architecture:

- **Frontend**: 
  - React with TypeScript, using Vite as the build tool
  - Built on [shadcn/ui](https://ui.shadcn.com/) components, a collection of reusable, accessible, and customizable UI components
  - Uses Tailwind CSS for styling
  - BlockNote for rich text editing in the Notes feature
- **Backend**: Python Flask API
- **Data Storage**: Currently uses in-memory storage (JSON), with plans to integrate a database system

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Python (v3.8+)
- pip

### Frontend Setup

1. Clone the repository
   ```bash
   git clone https://github.com/tjallingvds/concept_map_app.git
   cd concept_map_app
   ```

2. Navigate to the frontend directory
   ```bash
   cd concept-map/frontend
   ```

3. Install dependencies
   ```bash
   npm install
   # or
   yarn
   ```

4. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. The frontend should now be running at http://localhost:5173

### Backend Setup

1. Navigate to the backend directory
   ```bash
   cd concept-map/backend
   ```

2. Create a virtual environment
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```

5. Create a `.env` file based on `.env.example`
   ```bash
   cp .env.example .env
   ```

6. Run the server
   ```bash
   python run.py
   # or
   flask run
   ```

7. The API server should now be running at http://localhost:5001

### Environment Configuration

The application uses environment variables for configuration to avoid hardcoding values and make deployment to different environments easier:

#### Frontend Environment Variables (.env file)
- `VITE_API_BASE_URL`: The URL of the backend API server (default: http://localhost:5001)

#### Backend Environment Variables (.env file)
- `FLASK_APP`: The main Flask application file (default: app.py)
- `FLASK_ENV`: The environment to run Flask in (development/production)
- `FLASK_DEBUG`: Enable/disable debug mode (1/0)
- `PORT`: The port to run the API server on (default: 5001)
- `GEMINI_API_KEY`: API key for Google's Gemini model
- `FRONTEND_URL`: The URL of the frontend application (default: http://localhost:5173)

**Important**: Always use environment variables for configuration instead of hardcoding URLs or other sensitive information in the codebase. This ensures the application can be deployed to different environments without code changes.

## 📋 Tasks and Project Management

Project tasks, feature requests, and bug tracking are managed in our Notion workspace. You can find all current and upcoming tasks at:

[CS162 Concept Map Builder](https://www.notion.so/CS162-Concept-Map-Builder-19a15d87bb3280b98e32c2db471fbfd0)

Before starting work on a new feature or bug fix, please check the Notion page to:
1. See if the task is already assigned to someone
2. Understand the priority and requirements of each task
3. Find related tasks that might affect your work
4. Update the status of tasks you're working on

If you'd like to take on a specific task, please comment on the relevant Notion page and tag the project maintainers.

## 👥 Contributing

We welcome contributions to the Concept Map App! This section provides detailed guidelines to help you contribute effectively.

### Development Workflow

1. **Fork the Repository**: Create your own fork of the project

2. **Clone Your Fork**:
   ```bash
   git clone https://github.com/your-username/concept_map_app.git
   cd concept_map_app
   ```

3. **Set Up Remote**:
   ```bash
   git remote add upstream https://github.com/original-owner/concept_map_app.git
   ```

4. **Create a Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. **Make Your Changes**: Implement your feature or bug fix

6. **Run Tests**: Ensure your changes don't break anything
   ```bash
   # Frontend
   cd concept-map/frontend
   npm run test
   
   # Backend
   cd concept-map/backend
   python -m pytest
   ```

7. **Commit Your Changes**: Follow our [commit message guidelines](#commit-message-guidelines)
   ```bash
   git commit -m "feat: add new feature"
   ```

8. **Stay Updated**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

9. **Push Your Changes**:
   ```bash
   git push origin feature/your-feature-name
   ```

10. **Submit a Pull Request**: Create a PR from your branch to the main repository's main branch

### Code Style and Standards

#### Frontend (React/TypeScript)

- Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use TypeScript for type safety
- Format code with Prettier
- Ensure ESLint passes with no errors
- Use functional components with hooks
- Follow the component structure in the project

#### Backend (Python/Flask)

- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) style guide
- Use type hints where possible
- Document functions and classes with docstrings
- Organize code into modular components
- Write tests for new functionality

### Pull Request Process

1. **PR Template**: Fill out the pull request template completely
2. **Linked Issue**: Ensure your PR is linked to an issue (create one if needed)
3. **CI Checks**: Make sure all CI checks pass
4. **Documentation**: Update documentation if necessary
5. **Code Review**: Address any feedback from code reviews
6. **Approval**: Wait for approval from at least one maintainer
7. **Merge**: A maintainer will merge your PR when it's ready

### Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types include:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Issue Tracking

1. **Before submitting an issue**, search to see if it has already been reported
2. **Use the issue templates** provided in the repository
3. **Be clear and descriptive** about the problem or feature request
4. **Provide steps to reproduce** for bug reports
5. **Include screenshots** if applicable
6. **Tag issues** appropriately with labels

## 📞 Contact

For questions, suggestions, or discussions about the project, please:

- Create an issue in the repository
- Reach out through the project Notion workspace
- Contact the project maintainers directly through their provided contact information

---

Thank you for your interest in contributing to the Concept Map App!
