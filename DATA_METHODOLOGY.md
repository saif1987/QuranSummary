# Data Generation Methodology for Quran Surah Section Analysis

This document outlines the process used to obtain and structure the data for the Surah section analysis presented in this project. The primary goal was to perform a thematic analysis of Surah texts, generate section titles and summaries, and then translate and adapt these for a Bangla-speaking audience familiar with Islamic terminology.

## 1. Source of Translations

The initial English and Bangla translations of the Quranic Surahs were sourced from the following open-source repository:

*   **Repository:** [BanglaQuranOffline by gitproject09](https://github.com/gitproject09/BanglaQuranOffline)
*   **Specific Asset Location:** The HTML files containing the translations were found within the `app/src/main/assets/` directory of the aforementioned repository.
    *   Direct link to the tree at the time of data extraction: https://github.com/gitproject09/BanglaQuranOffline/tree/master/app/src/main/assets

The assets directory contained individual HTML files for each Surah (e.g., `1.html`, `2.html`, ..., `114.html`).

## 2. Extraction of English Translation

The English translation for each Surah was extracted from its respective HTML file using command-line tools. The `grep` utility with Perl-compatible regular expressions (PCRE) was used to isolate the content within `<div class="english">...</div>` tags, and `sed` was used to remove any residual `<span>` tags.

An example command for extracting the English text from `2.html` (Surah Al-Baqarah) and saving it to `2.english.txt` is as follows:

```bash
(grep -oP '(?<=<div class="english">).*?(?=<\/div>)' 2.html | sed -E 's/<\/?span>//g') > 2.english.txt
```

This process was repeated for each Surah's HTML file to generate corresponding `.english.txt` files.

## 3. Thematic Analysis and CSV Generation via Google Gemini Agent

The extracted English text files (e.g., `2.english.txt`) were then processed by a custom Google Gemini agent. The agent was provided with a detailed prompt to perform a multi-layered thematic analysis and generate a CSV file (e.g., `2.csv`) for each Surah.

The core instructions given to the Gemini agent included:

### a. Thematic Sectioning (Judeo-Christian Lens)
*   **Instruction:** Read the entire English text of the Surah.
*   **Instruction:** Divide the text into sequential, thematic sections.
*   **Crucial Constraint:** For this initial division, the agent was instructed to use a pre-7th century Old and New Testament historical and theological knowledge base. The analysis was to focus on parallels to biblical narratives, laws, and prophetic discourse (e.g., creation, the fall of Adam, the exodus of the Children of Israel, covenants, community laws). The agent was explicitly told **not** to use any post-7th century Islamic interpretative knowledge for this specific step.
*   **Instruction:** For each section, determine the starting and ending verse numbers.

### b. Create Section Titles (English)
*   **Instruction:** For each identified section, create a short, evocative, two-word title in English that captures its core theme (e.g., "Adam's Fall," "Broken Covenants," "Community Law").

### c. Write Section Summaries (English)
*   **Instruction:** For each section, write a concise summary in English.
*   **Crucial Constraint:** The agent was instructed to maintain the Judeo-Christian linguistic and thematic tone established in the sectioning step, using terminology familiar within that context (e.g., "the Book," "the covenant," "the Fire of judgment," "the Holy Spirit").

### d. Translate and Adapt Summaries (Bangla with Islamic Terms)
*   **Instruction:** Translate each English section title and summary into standard Bangla.
*   **Crucial Constraint:** After translating, the agent was instructed to revise and adapt the Bangla text to use more resonant and traditional Islamic terminology, aiming for authenticity for a Muslim audience.
    *   Examples of adaptation provided:
        *   "God's favor" could become "আল্লাহর নেয়ামত" (Allah's Niyamat).
        *   "Abraham's religion" could become "মিল্লাতে ইবরাহীম" (Millat-e-Ibrahim).
        *   "Holy war" could become "জিহাদ" (Jihad).
        *   "Patience" could become "সবর" (Sabr).
        *   "The Creed" could become "ঈমানের ঘোষণা" (Iman-er Ghoshona).

### e. Generate the Final CSV File
*   **Instruction:** Combine all the generated information into a single CSV file (e.g., `2.csv`).
*   **CSV Headers (Exact Order):** `section_index,starting_verse,ending_verse,name_eng,name_bn,summary_eng,summary_bn`
*   **Formatting:** Ensure that any text containing commas is properly enclosed in double quotes.

### f. Final Output from Agent
*   **Instruction:** The agent's sole output for each input `.english.txt` file was to be the complete and final corresponding `.csv` file, populated according to all the instructions.

This process was repeated for each Surah to generate the individual `<surah_index>.csv` files used in this project. The `surah_name.csv` file, which lists all Surah names and indices, was compiled separately based on standard Quranic indexing.

## Disclaimer

The thematic sectioning and initial English summaries were generated based on a specific instruction to the AI to use a pre-7th century Judeo-Christian historical and theological lens. This was an experimental approach to explore thematic parallels. These initial interpretations do **not** represent traditional Islamic exegesis (Tafsir) or theological understanding.

The subsequent translation and adaptation into Bangla aimed to make the content more resonant with Islamic terminology, but the foundational thematic divisions remain based on the initial constrained AI analysis.

Users should be aware of this specific methodology and lens when interpreting the section names and summaries provided in this application. For authoritative Islamic interpretations, please consult traditional scholars and sources of Tafsir.

The data is provided for informational and experimental visualization purposes.

---

*This document details the methodology as of the last update. The process may be subject to refinement in future iterations.*