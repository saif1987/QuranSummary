let currentSurahIndex = 2; // Default Surah, will be dynamic
let allSurahNamesData = []; // To store all surah names once fetched

// DOM Element Selectors (cached)
const languageToggle = document.querySelector('.language-toggle');
const contentWrappers = document.querySelectorAll('.content-wrapper');
const langButtons = document.querySelectorAll('.lang-btn');

const modal = document.getElementById('popup-modal');
const modalContainer = document.getElementById('modal-container');
const modalContentHost = document.getElementById('modal-content-host');
const modalCloseButton = document.getElementById('modal-close-btn');
const saveJpgButton = document.getElementById('save-jpg-btn');

let surahSelectorLabel; // Changed from const to let
let surahSelector;      // Changed from const to let

const chartTitleEn = document.getElementById('chart-title-en');
const chartTitleBn = document.getElementById('chart-title-bn');
const chartContainerEn = document.getElementById('chart-container-en');
const chartContainerBn = document.getElementById('chart-container-bn');
const summaryGridEn = document.getElementById('summary-grid-en');
const summaryGridBn = document.getElementById('summary-grid-bn');

// --- Numeral Conversion (Global Scope) ---
const englishToBanglaNumerals = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

function convertToBanglaNumerals(numberInput) {
    const numberString = String(numberInput); // Ensure input is a string
    let banglaNumber = '';
    for (let i = 0; i < numberString.length; i++) {
        banglaNumber += englishToBanglaNumerals[numberString[i]] || numberString[i];
    }
    return banglaNumber;
}

function setLanguage(lang) {
    contentWrappers.forEach(wrapper => wrapper.classList.remove('active'));
    langButtons.forEach(btn => btn.classList.remove('active'));

    document.getElementById('content-' + lang).classList.add('active');
    document.getElementById('btn-' + lang).classList.add('active');

    document.body.style.fontFamily = lang === 'bn' ? 'var(--font-bn)' : 'var(--font-en)';

    // Update Surah selector label language
    if (surahSelectorLabel) {
        surahSelectorLabel.textContent = lang === 'bn' ? 'সূরা নির্বাচন করুন:' : 'Select Surah:';
    }
    populateSurahDropdown(lang); // Update dropdown options language and selection
}

let contentToSave = null;

function showPopup(event) {
    const sourceElement = event.currentTarget;
    if (!sourceElement) return;

    const rect = sourceElement.getBoundingClientRect();

    // Set position and width based on the clicked element
    modalContainer.style.width = `${rect.width}px`;
    modalContainer.style.top = `${rect.top}px`;
    modalContainer.style.left = `${rect.left}px`;
    modalContainer.style.borderRadius = window.getComputedStyle(sourceElement).borderRadius;
    
    const contentClone = sourceElement.cloneNode(true);
    contentClone.classList.remove('clickable');
    // Robustly remove onclick if it exists, though it shouldn't with current HTML
    if (contentClone.hasAttribute('onclick')) {
        contentClone.removeAttribute('onclick');
    }

    // Ensure the clone fills the modal content host correctly
    contentClone.style.width = '100%';
    contentClone.style.height = 'auto'; // Let content dictate its height, modal-content-host will scroll
    contentClone.style.maxWidth = '100%'; // Override any max-width from original classes like .chart-container
    contentClone.style.margin = '0';      // Reset any margins on the clone itself
    contentClone.style.boxSizing = 'border-box'; // Ensure padding/border are included within the 100% width

    contentToSave = contentClone;

    modalContentHost.innerHTML = '';
    modalContentHost.appendChild(contentClone);

    // CRITICAL: Make the modal overlay visible *before* attempting to measure
    // the offsetHeight of its children. Otherwise, offsetHeight will be 0.
    modal.style.display = 'block';

    // Calculate the height needed
    const modalActionsElement = modalContainer.querySelector('.modal-actions');
    const actionsHeight = modalActionsElement ? modalActionsElement.offsetHeight : 0;
    const clonedContentHeight = contentClone.offsetHeight; // Height of the actual cloned content

    // Optional: Log the calculated heights for debugging
    // console.log(`actionsHeight: ${actionsHeight}, clonedContentHeight: ${clonedContentHeight}`);

    modalContainer.style.height = `${clonedContentHeight + actionsHeight}px`;

}

function closePopup(event) {
    if (!event || event.target === modal || event.target.classList.contains('modal-close-btn')) {
        modal.style.display = 'none';
        modalContentHost.innerHTML = '';
        contentToSave = null;
    }
}

function saveAsJpg() {
    if (!contentToSave) return;

    const titleElement = contentToSave.querySelector('h1, h2');
    const fileName = (titleElement ? titleElement.textContent.trim() : 'analysis-section').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.jpg';

    html2canvas(contentToSave, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff'
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
    }).catch(err => console.error("Error saving image:", err));
}

// --- Data Loading and Rendering ---

/**
 * A simple CSV parser.
 * @param {string} csvText The raw CSV text.
 * @returns {Array<Object>} An array of objects.
 */
function parseCSV(csvText) {
    const trimmedCsvText = csvText.trim();
    if (!trimmedCsvText) return []; // Handle empty input
    const lines = trimmedCsvText.split(/\r?\n/); // Handles \n and \r\n
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/(".*?"|[^",\r\n]+)(?=\s*,|\s*$)/g) || [];
        if (values.length === headers.length) {
            const row = {};
            for (let j = 0; j < headers.length; j++) {
                let value = values[j].trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1).replace(/""/g, '"'); // Handle double quotes inside
                }
                row[headers[j]] = value;
            }
            rows.push(row);
        }
        // Optional: Add an else case here to log or handle rows with mismatched column counts
        // else if (lines[i].trim() !== '') { console.warn(`Skipping malformed CSV line: ${lines[i]}`); }
    }
    return rows;
}

async function loadSectionDataAndRender() { // Renamed for clarity
    try {
        // Fetch only the section data for the currentSurahIndex
        clearPageContent(); // Clear previous content before loading new data
        const sectionsResponse = await fetch(`data/${currentSurahIndex}.csv`);
        if (!sectionsResponse.ok) {
            // Content already cleared by the call above
            throw new Error(`Failed to fetch section data for Surah ${currentSurahIndex}: ${sectionsResponse.statusText} (status: ${sectionsResponse.status})`);
        }
        const sectionsText = await sectionsResponse.text();
        console.log(`Attempting to parse sections CSV data for Surah ${currentSurahIndex}...`);
        const sectionsData = parseCSV(sectionsText);

        if (sectionsData && sectionsData.length > 0) { // Added null check for sectionsData
            console.log("Successfully parsed sectionsData:", sectionsData);
        } else {
            // Content already cleared
            console.warn(`Parsed sectionsData for Surah ${currentSurahIndex} is empty. Check ${currentSurahIndex}.csv format or content.`);
            const currentLang = document.body.style.fontFamily.includes('Bengali') ? 'bn' : 'en'; // More robust lang check
            const surahNumDisplay = currentLang === 'bn' ? convertToBanglaNumerals(currentSurahIndex) : currentSurahIndex;
            if(chartTitleEn) chartTitleEn.textContent = `No section data found for Surah ${currentSurahIndex}.`;
            if(chartTitleBn) chartTitleBn.textContent = `সূরা ${surahNumDisplay} এর জন্য কোন সেকশন ডেটা পাওয়া যায়নি।`;
            return;
        }

        if (allSurahNamesData.length === 0) {
            console.error("allSurahNamesData is empty. Cannot find Surah info.");
            // This case should ideally be handled by the initial fetch in DOMContentLoaded
            return;
        }

        const surahInfo = allSurahNamesData.find(s => parseInt(s.surah_index) === currentSurahIndex);

        if (!surahInfo) {
            console.error(`Surah with index ${currentSurahIndex} not found in allSurahNamesData.`);
            // Content already cleared
            const currentLang = document.body.style.fontFamily.includes('Bengali') ? 'bn' : 'en';
            const surahNumDisplay = currentLang === 'bn' ? convertToBanglaNumerals(currentSurahIndex) : currentSurahIndex;
            if(chartTitleEn) chartTitleEn.textContent = `Surah ${currentSurahIndex} metadata not found.`;
            if(chartTitleBn) chartTitleBn.textContent = `সূরা ${surahNumDisplay} এর তথ্য পাওয়া যায়নি।`;
            return;
        }

        renderPage(surahInfo, sectionsData);

    } catch (error) {
        // Ensure content is cleared on error, though it might have been by the initial call
        console.error("Failed to load or render data:", error);
        const errorLang = document.body.style.fontFamily.includes('Bengali') ? 'bn' : 'en';
        const errorIndexText = errorLang === 'bn' ? convertToBanglaNumerals(currentSurahIndex) : currentSurahIndex;
        if(chartTitleEn) chartTitleEn.textContent = `Error loading data for Surah ${errorIndexText}.`;
        if(chartTitleBn) chartTitleBn.textContent = `সূরা ${errorIndexText} এর তথ্য লোড করতে ত্রুটি।`;
    }
}

function populateSurahDropdown(currentLang) {
    if (!surahSelector || allSurahNamesData.length === 0) return;

    const previousValue = surahSelector.value; // Preserve selection if possible
    surahSelector.innerHTML = ''; // Clear existing options

    allSurahNamesData.forEach(surah => {
        const option = document.createElement('option');
        option.value = surah.surah_index;

        const indexText = currentLang === 'bn' ? convertToBanglaNumerals(surah.surah_index) : surah.surah_index;
        const nameText = currentLang === 'bn' ? surah.name_bn : surah.name_eng;
        option.textContent = `${indexText}. ${nameText}`;

        // Stage 2: Disable option if data file is not available
        if (!surah.hasDataFile) {
            option.disabled = true;
            option.textContent += (currentLang === 'bn' ? ' (ডেটা নেই)' : ' (No Data)');
        }

        if (parseInt(surah.surah_index) === parseInt(previousValue) || (!previousValue && parseInt(surah.surah_index) === currentSurahIndex)) {
            option.selected = true;
        }
        surahSelector.appendChild(option);
    });
    // Ensure the currentSurahIndex is selected if previousValue wasn't matched (e.g., on first load)
    if (surahSelector.value !== String(currentSurahIndex)) { // Check if current selection is not already the desired one
        surahSelector.value = String(currentSurahIndex);
    }
}

function renderPage(surahInfo, sections) {
    // Render titles
    document.getElementById('chart-title-en').textContent = `Analysis of ${surahInfo.name_eng} Sections`;
    document.getElementById('chart-title-bn').textContent = `${surahInfo.name_bn} অংশের বিভাজন`;
    // Containers are already cached globally (chartContainerEn, chartContainerBn, summaryGridEn, summaryGridBn)
    
    // The main clearing is now handled by clearPageContent() before this function is called.
    // This function can assume it's rendering into a relatively clean state (titles might still be there).
    // However, for robustness, we can still clear the specific dynamic parts within chart containers.
    const clearDynamicContentInContainer = (container) => {
        if (!container) return;
        // Remove all children except the first one (assuming it's the H1 title)
        // This is a simple way to clear previous rows/cards.
        while (container.children.length > 1) {
            // Check if the last child is NOT an H1 before removing.
            // This is a safeguard in case the H1 isn't the first child or structure changes.
            if (container.lastChild && container.lastChild.tagName !== 'H1') {
                container.removeChild(container.lastChild);
            } else {
                break; // Stop if only H1 is left or H1 is the last child
            }
        }
    };

    if (chartContainerEn) clearDynamicContentInContainer(chartContainerEn);
    if (chartContainerBn) clearDynamicContentInContainer(chartContainerBn);
    // Grids don't have a persistent title element within them, so direct clear is fine.
    summaryGridEn.innerHTML = '';
    summaryGridBn.innerHTML = '';

    // Prepare for chart rendering
    // Numeral conversion functions are now global

    // Helper for verse range text with language conversion
    function getVerseRangeText(start, end, lang) {
        const s = lang === 'bn' ? convertToBanglaNumerals(start) : start;
        const e = lang === 'bn' ? convertToBanglaNumerals(end) : end;
        return `[${s}-${e}]`;
    }

    const verseCounts = sections.map(s => parseInt(s.ending_verse) - parseInt(s.starting_verse) + 1);
    const maxVerseCount = Math.max(...verseCounts, 1); // Avoid division by zero

    // Helper function to create a chart row
    function createChartRowElement(section, barWidthPercent, lang) { // Added lang parameter
        const chartRow = document.createElement('div');
        chartRow.className = 'chart-row';
        chartRow.innerHTML = `
            <div class="section-name">${section.name_lang}</div>
            <div class="bar-area">
                <div class="bar" style="width: ${barWidthPercent}%;"></div>
                <div class="chart-verse-span">[${
                    lang === 'bn' ? convertToBanglaNumerals(section.starting_verse) : section.starting_verse
                }-${
                    lang === 'bn' ? convertToBanglaNumerals(section.ending_verse) : section.ending_verse
                }]</div>
            </div>
        `;
        return chartRow;
    }

    // Helper function to create a summary card
    function createSummaryCardElement(section, lang) {
        const card = document.createElement('div');
        card.id = `summary-${lang}-${section.section_index}`;
        card.className = 'summary-card clickable';
        const sectionIndexDisplay = lang === 'bn' ? convertToBanglaNumerals(section.section_index) : section.section_index;
        // card.setAttribute('onclick', 'showPopup(event)'); // Replaced by event listener
        card.innerHTML = `
            <h2>${sectionIndexDisplay}. ${section.name_lang}</h2>
            <p class="verse-info">${lang === 'en' ? 'Verses' : 'আয়াত'}: ${getVerseRangeText(section.starting_verse, section.ending_verse, lang)}</p>
            <p>${section.summary_lang}</p>
        `;
        return card;
    }

    sections.forEach((section, index) => {
        const verseCount = verseCounts[index];
        const barWidth = (verseCount / maxVerseCount) * 95; // 95% to leave some space

        // --- Render Chart Rows ---
        chartContainerEn.appendChild(createChartRowElement({ ...section, name_lang: section.name_eng }, barWidth, 'en'));
        chartContainerBn.appendChild(createChartRowElement({ ...section, name_lang: section.name_bn }, barWidth, 'bn'));

        // --- Render Summary Cards ---
        summaryGridEn.appendChild(createSummaryCardElement({ ...section, name_lang: section.name_eng, summary_lang: section.summary_eng }, 'en'));
        summaryGridBn.appendChild(createSummaryCardElement({ ...section, name_lang: section.name_bn, summary_lang: section.summary_bn }, 'bn'));
    });

    // Add click listeners to newly created clickable elements
    document.querySelectorAll('.clickable').forEach(element => {
        element.addEventListener('click', showPopup);
    });
}

function clearPageContent() {
    // Function to clear a container but attempt to keep its H1 title
    const clearContainerKeepTitle = (container) => {
        if (!container) return;
        while (container.children.length > 1) { // Keep the h1 title
            // Check if the last child is NOT an H1 before removing.
            // If the H1 is the only child left, or the last child is H1, stop.
            if (container.lastChild && container.lastChild.tagName !== 'H1') {
                container.removeChild(container.lastChild);
            } else {
                break; // Stop if only H1 is left or H1 is the last child
            }
        }
    };

    if (chartContainerEn) clearContainerKeepTitle(chartContainerEn);
    if (chartContainerBn) clearContainerKeepTitle(chartContainerBn);
    if (summaryGridEn) summaryGridEn.innerHTML = '';
    if (summaryGridBn) summaryGridBn.innerHTML = '';
    
}

// --- Event Listeners ---
function initializeEventListeners() {
    langButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            setLanguage(event.target.dataset.lang);
        });
    });

    if(modalCloseButton) modalCloseButton.addEventListener('click', closePopup);
    if(saveJpgButton) saveJpgButton.addEventListener('click', saveAsJpg);
    if(modal) modal.addEventListener('click', closePopup); // For clicking on overlay to close

    window.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            closePopup(null); // Pass null or an event-like object if needed by closePopup
        }
    });

    if (surahSelector) {
        surahSelector.addEventListener('change', (event) => {
            const newIndex = parseInt(event.target.value);
            if (newIndex !== currentSurahIndex) {
                currentSurahIndex = newIndex;
                loadSectionDataAndRender(); // Load data for the new surah
            }
        });
    }
    // Initial setup for clickable containers (if they are static and not cleared/re-added)
    // If they are cleared and re-added, listeners should be added after re-creation as done in renderPage.
    // For now, assuming the main containers might be static and their children are dynamic.
    // If chartContainerEn/Bn themselves are the primary click targets for the popup:
    if(chartContainerEn) chartContainerEn.addEventListener('click', showPopup);
    if(chartContainerBn) chartContainerBn.addEventListener('click', showPopup);
}

document.addEventListener('DOMContentLoaded', async function () { // Make async
    // Initialize dropdown-specific DOM elements here to ensure DOM is ready
    surahSelectorLabel = document.getElementById('surah-selector-label');
    surahSelector = document.getElementById('surah-selector');

    try {
        const namesResponse = await fetch('data/surah_name.csv');
        if (!namesResponse.ok) {
            throw new Error(`Failed to fetch surah_name.csv: ${namesResponse.statusText} (status: ${namesResponse.status})`);
        }
        const namesText = await namesResponse.text();
        allSurahNamesData = parseCSV(namesText);

        if (allSurahNamesData.length === 0) {
            console.warn("Parsed allSurahNamesData is empty. Check surah_name.csv format or content.");
            // Display a more user-friendly error on the page itself
            document.body.innerHTML = '<p style="color: red; text-align: center; padding: 2em;">Error: Could not load Surah list. Please check data files and ensure they are accessible.</p>';
            return; // Stop further execution if critical data is missing
        }
        console.log("Successfully loaded and parsed surah_name.csv:", allSurahNamesData);

        // Check availability of section data files for each Surah
        const availabilityChecks = allSurahNamesData.map(surah =>
            fetch(`data/${surah.surah_index}.csv`, { method: 'HEAD' }) // HEAD request is efficient
                .then(response => response.ok) // true if status is 200-299
                .catch(() => false) // Network error or other issue means not available
        );

        const availabilityResults = await Promise.all(availabilityChecks);
        allSurahNamesData.forEach((surah, index) => {
            surah.hasDataFile = availabilityResults[index];
            if (!surah.hasDataFile) {
                console.warn(`Data file for Surah ${surah.surah_index} (${surah.name_eng}) not found or not accessible.`);
            }
        });
        console.log("Surah data file availability checked:", allSurahNamesData);

    } catch (error) {
        console.error("Failed to load initial surah names data:", error);
        document.body.innerHTML = `<p style="color: red; text-align: center; padding: 2em;">Critical Error: Could not load initial application data. ${error.message}</p>`;
        return; // Stop further execution
    }

    initializeEventListeners();
    // Populate dropdown first, then load data, then set language
    populateSurahDropdown('en'); // Populate with default language (English)
    await loadSectionDataAndRender(); // Load data for the default Surah
    setLanguage('en'); // Set default language and ensure UI consistency
});