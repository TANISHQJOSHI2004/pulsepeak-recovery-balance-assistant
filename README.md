# PulsePeak Fitness – Smart Recovery and Burnout Balance Assistant

This project was developed for **SIT774 Web Technologies and Development – Task 10.3HD**.

It implements my proposed **Smart Recovery and Burnout Balance Assistant** feature for the PulsePeak Fitness website. The purpose of this feature is to help users check their current recovery condition, estimate burnout risk, receive personalised recovery advice, and view a balanced next-week plan.

## Feature Overview

The Recovery and Burnout Balance Assistant is designed as a guided website feature that allows users to:

- complete a short recovery check-in
- enter details such as goal, workout days, sleep quality, stress level, soreness, and energy
- receive a burnout-risk result such as **Low**, **Medium**, or **High**
- see the main reasons behind the result
- receive recovery advice for the next week
- view a balanced next-week plan
- save previous check-ins in the database and review recent history

This feature was based on my earlier proposal and then implemented as a working prototype.

## Technologies Used

- HTML
- CSS
- JavaScript
- Node.js
- SQLite (`sqlite3`)

## Main Files

- `server.js` – handles the local server, API routes, and SQLite database logic
- `public/recovery.html` – user interface for the Recovery Check feature
- `public/recovery.js` – client-side logic for form submission, result display, and history loading
- `public/styles.css` – styling for the website and recovery assistant screens
- `public/main.js` – shared website interactions such as menu, search, filter, and accordion features
- `pulsepeak.db` – SQLite database file used to store recovery check and website data

## How the Feature Works

1. The user opens the **Recovery Check** page from the PulsePeak website.
2. The user completes the check-in form.
3. The system applies a **rule-based scoring logic** to the responses.
4. A burnout-risk level is generated.
5. The page displays:
   - the risk level
   - the main reasons behind the result
   - personalised recovery advice
   - a next-week plan
6. The result is also saved into the SQLite database.
7. The user can review previous check-ins from the history section.

## Rule-Based Logic

The first version of this feature uses a transparent rule-based scoring system.

Examples:
- low sleep increases the burnout score
- high stress increases the burnout score
- high soreness increases the burnout score
- low energy increases the burnout score
- too many workout days increases the burnout score

The final score is then mapped into:
- **Low Risk**
- **Medium Risk**
- **High Risk**

This approach was selected because it is simple, practical, explainable, and suitable for a student project.

## Accessibility and Usability

This feature was designed with usability and accessibility in mind by using:

- clear labels
- simple language
- visible buttons
- structured sections
- readable result explanations
- text-based indicators instead of relying only on colour
- logical user flow matching the original lo-fi screens

## How to Run the Project

1. Open the project folder in VS Code
2. Open the terminal
3. Install dependencies

```bash
npm install sqlite3
