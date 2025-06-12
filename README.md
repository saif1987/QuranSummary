# Quran Surah Section Analysis Visualizer

This project provides an interactive visualization of the sections within a specific Surah of the Quran (currently configured for Surah Al-Baqarah, index 2). It displays a bar chart representing the verse distribution across sections and a grid of summary cards for each section. The interface supports both English and Bengali languages.

## Features

*   Visual bar chart of Surah sections by verse count.
*   Detailed summary cards for each section.
*   Language toggle between English and Bengali.
*   Clickable sections pop up in a modal for focused view.
*   Ability to save the focused view (chart or summary card) as a JPG image.
*   Data-driven content loaded from CSV files.

## Project Structure

```
QuranSummary/
├── public/                 # All publicly servable static assets
│   ├── css/
│   │   └── style.css       # Stylesheets
│   ├── data/
│   │   ├── 2.csv           # Section data for the Surah
│   │   └── surah_name.csv  # Surah name data
│   ├── js/
│   │   └── script.js       # JavaScript logic
│   └── index.html          # Main HTML file
└── README.md               # This readme file
```

## How to Run Locally

To run this project, you need a simple local HTTP server to serve the files, as modern browsers restrict `fetch` requests for local files (`file:///`) due to CORS policy.

1.  **Navigate to the `public` directory:**
    Open your terminal or command prompt and change to the `public` directory within the project.
    ```bash
    cd path/to/QuranSummary/public
    ```
2.  **Start a local HTTP server:**
    *   If you have Python 3:
        ```bash
        python -m http.server 8000
        ```
    *   If you have Python 2:
        ```bash
        python -m SimpleHTTPServer 8000
        ```
    *   Alternatively, you can use other tools like Node.js `http-server` or VS Code's "Live Server" extension (making sure it serves from the `public` directory).

3.  **Open in browser:**
    Open your web browser and go to `http://localhost:8000`.

## Data Files

*   `public/data/2.csv`: Contains the section details (index, start/end verse, names, summaries).
*   `public/data/surah_name.csv`: Contains the Surah index and its names in English and Bengali.

To display a different Surah, you would need to update `SURAH_INDEX` in `public/js/script.js` and provide the corresponding CSV data file (e.g., `3.csv` if `SURAH_INDEX` is 3).